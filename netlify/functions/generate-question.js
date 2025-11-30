// netlify/functions/generate-question.js

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: 'Method Not Allowed',
      };
    }

    const body = JSON.parse(event.body || '{}');

    const { accessCode } = body;
    const expectedCode = process.env.ACCESS_CODE;

    if (!expectedCode || accessCode !== expectedCode) {
      return {
        statusCode: 403,
        body: 'Forbidden: invalid or missing access code.',
      };
    }

    const {
      projectName,
      typology,
      location,
      users,
      goals,
      timeHorizon,
      systems,
      constraints,
      painPoints,
    } = body;

    if (!projectName || !typology || !location || !users || !goals) {
      return {
        statusCode: 400,
        body: 'Missing required fields.',
      };
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.error('Missing OPENAI_API_KEY');
      return {
        statusCode: 500,
        body: 'Server misconfigured: missing OPENAI_API_KEY',
      };
    }

    const systemPrompt = `
You are "Tech-First Thinking", an Innovation Architect assistant focused on AIRPORTS.
You are helping the user define a tech-first, outcome-driven brief for an airport project.

Before you generate a full report, your task is to ask EXACTLY ONE strategically important clarifying question that will improve the quality of the analysis.

You must:
- Read the project data carefully.
- Identify the single most leverageable unknown that would significantly sharpen your understanding of the airport's needs, constraints, or opportunities.
- Ask ONE question only.
- The question should be specific, focused, and written in plain language.
- Do NOT ask multi-part questions.
- Do NOT add preamble, explanations, or follow-up.
- Your entire response should be the question itself, nothing else.

PROJECT DATA:
- Project name: ${projectName}
- Airport area / typology: ${typology}
- Location/context: ${location}
- Primary users/stakeholders: ${users}
- Stated goals: ${goals}
- Time horizon: ${timeHorizon || 'not specified'}
- Known/Existing digital systems: ${systems || 'not specified'}
- Constraints / non-negotiables: ${constraints || 'not specified'}
- Pain points / frustrations: ${painPoints || 'not specified'}
    `.trim();

    const userPrompt = `
Based on the project data above, ask exactly ONE clarifying question that will most improve your ability to generate a tech-first airport strategy. Respond with only the question text.
    `.trim();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.0',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI error (question):', errText);
      return {
        statusCode: 500,
        body: 'Error from OpenAI API (question)',
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: content }),
    };
  } catch (err) {
    console.error('Function error (question):', err);
    return {
      statusCode: 500,
      body: 'Server error (question)',
    };
  }
};
