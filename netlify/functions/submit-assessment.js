// netlify/functions/submit-assessment.js

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const AIRTABLE_TOKEN   = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appz0D6kUon2e70B5';
  const ASSESSMENT_TABLE = 'Assessment Data';
  const MEMBER_TABLE     = 'Member Registry';

  if (!AIRTABLE_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const headers = {
    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // ── Step 1: Look up Member by email OR phone in Member Registry ──
  let memberRecordId = null;
  try {
    let filterFormula;
    if (data.email) {
      filterFormula = encodeURIComponent(`{Email} = "${data.email}"`);
    } else if (data.phone) {
      filterFormula = encodeURIComponent(`{Phone} = "${data.phone}"`);
    }

    if (filterFormula) {
      const lookupRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(MEMBER_TABLE)}?filterByFormula=${filterFormula}&maxRecords=1`,
        { headers }
      );
      const lookupData = await lookupRes.json();
      if (lookupData.records && lookupData.records.length > 0) {
        memberRecordId = lookupData.records[0].id;
      }
    }
  } catch (err) {
    console.error('Member lookup error:', err);
  }

  // ── Step 2: Build Assessment Data record ──
  const fields = {
    'Assessment Type': 'PSS + PSYCHLOPS',
    'Assessment Date': data.assessmentDate,

    // PSYCHLOPS
    'PSYCHLOPS: Problem Description': data.psychlopsProblem,
    'PSYCHLOPS: Problem Impact':      data.psychlopsImpact,
    'PSYCHLOPS: Functioning':         data.psychlopsFunctioning,
    'PSYCHLOPS: Wellbeing':           data.psychlopsWellbeing,
    'PSYCHLOPS: Total Score':         data.psychlopsTotal,

    // PSS
    'PSS Q1':          data['PSS Q1'],
    'PSS Q2':          data['PSS Q2'],
    'PSS Q3':          data['PSS Q3'],
    'PSS Q4':          data['PSS Q4'],
    'PSS Q5':          data['PSS Q5'],
    'PSS Q6':          data['PSS Q6'],
    'PSS Q7':          data['PSS Q7'],
    'PSS Q8':          data['PSS Q8'],
    'PSS Q9':          data['PSS Q9'],
    'PSS Q10':         data['PSS Q10'],
    'PSS Total Score': data.pssTotalScore,
  };

  // Link to Member Registry if we found a match
  if (memberRecordId) {
    fields['Member ID'] = [memberRecordId];
  }

  // ── Step 3: Create Assessment Data record ──
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(ASSESSMENT_TABLE)}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Airtable error:', result);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: result.error?.message || 'Airtable error' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: result.id, memberLinked: !!memberRecordId }),
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
