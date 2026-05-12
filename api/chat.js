module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages 필요" });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  const systemPrompt = `당신은 더존 스마트A10 기준 계정과목 전문 회계 도우미입니다. 어학원 운영비 관련 질문에 짧고 명확하게 한국어로 답변하세요.
주요 판관비(800번대): 801임원급여 802직원급여 803상여금 804제수당 805잡급 806퇴직급여 811복리후생비 812여비교통비 813접대비 814통신비 815수도광열비 816전력비 817세금과공과금 818감가상각비 819지급임차료 820수선비 821보험료 822차량유지비 825교육훈련비 826도서인쇄비 827회의비 829사무용품비 830소모품비 831지급수수료 833광고선전비 837건물관리비.
예시: "A4용지 구매" → 830소모품비, "인터넷 요금" → 814통신비, "직원 식대" → 811복리후생비, "월세" → 819지급임차료.`;

  // Gemini용 contents 변환 (system은 첫 user 메시지에 합침)
  const contents = messages.map((m, i) => {
    if (i === 0 && m.role === 'user') {
      return { role: 'user', parts: [{ text: systemPrompt + '\n\n사용자 질문: ' + m.content }] };
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    };
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
        })
      }
    );
    const data = await response.json();
    if (!response.ok) return res.status(200).json({ error: `Gemini 오류: ${data?.error?.message || response.status}` });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.status(200).json({ text });
  } catch(e) {
    res.status(200).json({ error: e.message });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: '1mb' } }
};
