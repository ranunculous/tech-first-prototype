// netlify/functions/generate-report.js

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: 'Method Not Allowed',
      };
    }

    const body = JSON.parse(event.body || '{}');

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
      return {
        statusCode: 500,
        body: 'Server misconfigured: missing OPENAI_API_KEY',
      };
    }

    // --- System prompt: compressed Tech-First Thinking instructions ---
    const systemPrompt = `
You are "Tech-First Thinking", an Innovation Architect assistant.
Follow this 4-step process strictly: DISCOVER → DEFINE → DESIGN → DEPLOY.

Context:
- The user is working on a real building project.
- You must help them generate a structured, tech-first, outcome-driven brief.

Project data:
- Project name: ${projectName}
- Typology: ${typology}
- Location/context: ${location}
- Primary users/stakeholders: ${users}
- Top goals: ${goals}
- Time horizon: ${timeHorizon || 'not specified'}
- Known/Existing digital systems: ${systems || 'not specified'}
- Constraints/non-negotiables: ${constraints || 'not specified'}
- Pain points/frustrations: ${painPoints || 'not specified'}

Process:
1) DISCOVER – Tech Scan (NOW / NEXT)
  - Identify relevant technology categories (not vendors) for this typology and context.
  - Group into NOW (feasible today) and NEXT (emerging within the time horizon).
2) DEFINE – Outcomes
  - Propose 5–10 desired outcomes, expressed using this structure:
    Direction of improvement + Unit of measure + Object of control + Contextual clarifier.
  - Highlight the 3–5 most important outcomes based on the goals and pain points.
3) DESIGN – User Journeys + Tech Interventions
  - Identify 1–3 key user types and outline their journey in appropriate stages (e.g., ARRIVE → MOVE → USE → LEAVE).
  - At each stage, identify frictions and opportunities where tech from NOW/NEXT can help.
4) DEPLOY – Tech-First Thinking Report
  - Synthesize everything into a clear, structured report with these sections:
    1. Project Snapshot
    2. Tech Scan (NOW / NEXT)
    3. Priority Outcomes
    4. User Journeys & Key Frictions
    5. Tech-Enabled Opportunity List
    6. Tech-First Design Principles
    7. Tech-First Brief (1–2 pages of narrative)
    8. Day 1 / Day 2 / Day Future Roadmap

Tone:
- Write for professionals (architects, operators, airport/campus/hospital leaders).
- Be concrete, non-jargony, and succinct where possible.
- Tie recommendations back to outcomes and user experience, not tech for its own sake.
    `.trim();

    const userPrompt = `
Generate a complete Tech-First Thinking report for this project.
Use the 4-step process and the 8-section report structure described in the system prompt.
    `.trim();

    // Call OpenAI Chat Completions API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI error:', errText);
      return {
        statusCode: 500,
        body: 'Error from OpenAI API',
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: content }),
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: 'Server error',
    };
  }
};
