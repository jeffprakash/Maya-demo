import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function callOpenAIWithFunctions(userText) {
  const tools = [
    {
      type: "function",
      function: {
        name: "sent_message",
        description: "Send a short, friendly travel-related message to the user. Keep it crisp and to the point.",
        parameters: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The travel-related message to send to the user.",
            },
          },
          required: ["message"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "sent_next_msg_as_interactive_message",
        description: `
  At an appropriate point in the conversation (around the 4th or 5th user turn), ask the user if they want to receive a brochure or tourism link for a specific place, using an interactive reply button 📲.
  
  🚫 IMPORTANT RULE:
  - Only call this function if the user has **shown clear interest in one of these 5 places only**:
    ["fort kochi", "munnar", "idukki", "alapuzha", "kozhikode"].
  - ❌ If the user is discussing any other place, DO NOT call this function at all.
  - The message should be short, engaging, and about the specific place.
  
  Example: "Would you like a brochure or a tourism link for Munnar? 🌿"
  
  Do not use this tool for places outside the allowed list.
  `,
        parameters: {
          type: "object",
          properties: {
            place: {
              type: "string",
              enum: ['fort kochi', 'munnar', 'idukki', 'alapuzha', 'kozhikode'],
              description: "The exact place for which the brochure or link is being offered. Must be one from the allowed list.",
            },
            msg: {
              type: "string",
              description: "The short message to offer the brochure or link for the selected place.",
            },
          },
          required: ["place", "msg"],
        },
      },
    },
  ];  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1", // You can change this to another OpenAI model if desired
      messages: [{ role: "user", content: userText }],
      tools: tools,
      tool_choice: "auto",
    });

    return response.choices[0].message;
  } catch (error) {
    console.error("OpenAI API error:", error.response?.data || error.message);
    throw error;
  }
} 