module.exports = async function handler(req, res) {
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
- Keep all facts accurate, do not invent experience or credentials
- Improve bullet points to be impactful and quantified where possible
- Output the full tailored resume, ready to copy and use

JOB DESCRIPTION:
${jobdesc}

CANDIDATE'S RESUME:
${resume}

Output the tailored resume now:`;

  try {
    const https = require('https');

    const postData = JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (response.statusCode !== 200) {
              reject(new Error(parsed.error?.message || 'OpenAI error'));
            } else {
              resolve(parsed.choices?.[0]?.message?.content || '');
            }
          } catch (e) {
            reject(new Error('Failed to parse OpenAI response'));
          }
        });
      });

      request.on('error', reject);
      request.write(postData);
      request.end();
    });

    return res.status(200).json({ result });

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
