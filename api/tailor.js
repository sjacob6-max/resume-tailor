export default async function handler(req, res) {
  // Only allow POST requests
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
        // This reads your key from Vercel's environment variables — never exposed to users
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        stream: true,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json();
      return res.status(openaiRes.status).json({ error: err.error?.message || 'OpenAI error' });
    }

    // Stream the response directly back to the browser
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
