// netlify/functions/submit-assessment.js
// This function runs server-side on Netlify — your Airtable token stays hidden.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appz0D6kUon2e70B5';
  const TABLE_NAME = 'Assessment Data';

  if (!AIRTABLE_TOKEN) {
    console.error('Missing AIRTABLE_TOKEN environment variable');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Map form data to Airtable field names
  const fields = {
    'Assessment Type': 'PSS + PSYCHLOPS',
    'Assessment Date': data.assessmentDate,

    // User info (used to look up Member ID on your end)
    'First Name': data.firstName,
    'Last Name': data.lastName,
    'Email': data.email,

    // PSYCHLOPS
    'PSYCHLOPS: Problem Description': data.psychlopsProblem,
    'PSYCHLOPS: Problem Impact': data.psychlopsImpact,
    'PSYCHLOPS: Functioning': data.psychlopsFunctioning,
    'PSYCHLOPS: Wellbeing': data.psychlopsWellbeing,
    'PSYCHLOPS: Total Score': data.psychlopsTotal,

    // PSS individual questions
    'PSS Q1': data['PSS Q1'],
    'PSS Q2': data['PSS Q2'],
    'PSS Q3': data['PSS Q3'],
    'PSS Q4': data['PSS Q4'],
    'PSS Q5': data['PSS Q5'],
    'PSS Q6': data['PSS Q6'],
    'PSS Q7': data['PSS Q7'],
    'PSS Q8': data['PSS Q8'],
    'PSS Q9': data['PSS Q9'],
    'PSS Q10': data['PSS Q10'],
    'PSS Total Score': data.pssTotalScore,
  };

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
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
      body: JSON.stringify({ success: true, id: result.id }),
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
