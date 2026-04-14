const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const DEEPSEEK_API_KEY = 'sk-969fea26ec3a4c368576aa777fe0b1cf';

app.post('/api/analyze', async (req, res) => {
  const { tasks } = req.body;
  const taskDesc = (tasks || []).map((t, i) => {
    const flags = t && t.flags ? t.flags : {};
    const flagParts = [];
    if (flags.consequence) flagParts.push('错过有后果');
    if (flags.collaborate) flagParts.push('影响他人/协作');
    if (flags.defer) flagParts.push('可以推迟');
    const flagText = flagParts.length ? flagParts.join('，') : '无';
    return `${i + 1}. ${t.name || ''}${t.desc ? '（' + t.desc + '）' : ''}${t.mins ? '，预计' + t.mins + '分钟' : ''}${t.time ? '，截止' + t.time : ''}，标记：${flagText}`;
  }).join('\n');

  const prompt = `你是一个时间管理助手，请根据任务的截止时间、重要性、是否影响他人、是否有后果等因素，帮用户排出今天最合理的任务优先级。对每个任务返回：originalIndex（从0开始）、priority（P0/P1/P2/P3，P0最紧急）、reason（一句话中文理由，30字以内，口语化有温度，直接说为什么排在这个位置）。按优先级从高到低排列，只返回JSON数组不要其他文字。\n\n${taskDesc}`;
  
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await response.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const text = String(content || '').replace(/```json|```/g, '').trim();
    res.json(JSON.parse(text));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static(__dirname));

app.listen(3000, () => console.log('DayMind server running on http://localhost:3000'));