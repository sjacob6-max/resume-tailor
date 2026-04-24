export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resume, jobdesc } = req.body;

  if (!resume || !jobdesc) {
    return res.status(400).json({ error: 'Missing resume or job description' });
  }

  const prompt = `You are an expert resume writer and career coach. Tailor the candidate's resume to the job description below to maximize their chances of getting an interview.

Instructions:
- Rewrite to emphasize skills and experience that match the job description
- Mirror keywords and phrases from the job description naturally
- Keep all facts accurate — do not invent experience or credentials
- Improve bullet points to be impactful and quantified where possible
- Output the full tailored resume, ready to copy and use

JOB DESCRIPTION:
${jobdesc}

CANDIDATE'S RESUME:
${resume}

Output the tailored resume now:`;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        stream: false,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      return res.status(openaiRes.status).json({ error: data.error?.message || 'OpenAI error' });
    }

    const result = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ result });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
