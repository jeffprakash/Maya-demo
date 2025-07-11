import axios from 'axios';
import { whatsapp1, wa, useOpenAI, GEMINI_API_KEY, GEMINI_URL } from "./config.js";


/**
 * Calls Gemini API with function calling for a user message.
 * @param {string} userText - The user's message text.
 * @returns {Promise<object>} - Gemini API response.
 */
export async function callGeminiWithFunctions(userText, GEMINI_API_KEY, GEMINI_URL) {
  const data = {
    contents: {
      role: 'user',
      parts: [{ text: userText }]
    },
    tools: [
      {
        function_declarations: [
          {
            name: 'sent_message',
            description: 'Send a message to the user or perform a simple reply action.',
            parameters: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'The message to send to the user.'
                }
              },
              required: ['message']
            }
          },
          {
            name: 'sent_next_msg_as_interactive_message',
            description: 'At an appropriate point in the conversation, ask the user if they want to receive a brochure or link about tourism at a specific place using an interactive reply button. The message should be about the place and use the provided msg.',
            parameters: {
              type: 'object',
              properties: {
                place: {
                  type: 'string',
                  enum: ['fort kochi', 'munnar', 'idukki', 'alapuzha', 'kozhikode'],
                  description: 'The place for which the brochure or link is being offered.'
                },
                msg: {
                  type: 'string',
                  description: 'The message to ask about receiving a brochure or link for the place.'
                }
              },
              required: ['place', 'msg']
            }
          }
        ]
      }
    ]
  };

  try {
    const response = await axios.post(GEMINI_URL, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a WhatsApp interactive message with a link button.
 * @param {object} wa - WhatsApp instance.
 * @param {string} recipientPhone - Recipient's phone number.
 * @param {string} caption - Caption or description.
 * @param {string} url - URL to send.
 * @param {string} buttonText - Button text.
 */
export async function sendBrochureOrLink(wa, recipientPhone, caption, url,filename) {
  const finalUrl = url;

  console.log("finalUrl", finalUrl);
  const self_hosted_document =
{
    "link" : new URL( finalUrl ).href,
    "caption" : caption,
    "filename" : filename
};

console.log("self_hosted_document", self_hosted_document);
  const response = await wa.messages.document( self_hosted_document, recipientPhone );
  console.log("response", response);
  await sendVideoInteractiveMessage(wa, recipientPhone, `Would you like to receive a video about tourism at ${filename.replace(/_/g, ' ').replace('.pdf', '')}?`, filename.replace(/_/g, ' ').replace('.pdf', ''));
}

/**
 * Send a WhatsApp interactive reply button message for video.
 * @param {object} wa - WhatsApp instance.
 * @param {string} recipientPhone - Recipient's phone number.
 * @param {string} question - The question to ask.
 * @param {string} place - The place name to embed in the button ID.
 */
export async function sendVideoInteractiveMessage(wa, recipientPhone, question, place) {
  const interactiveMessage = {
    type: 'button',
    body: { text: question },
    action: {
      buttons: [
        { type: 'reply', reply: { id: 'yes_video_action', title: 'Yes' } },
        { type: 'reply', reply: { id: 'no_video_action', title: 'No' } }
      ]
    }
  };
  await wa.messages.interactive(interactiveMessage, recipientPhone);
}

/**
 * Send a WhatsApp interactive reply button message.
 * @param {object} wa - WhatsApp instance.
 * @param {string} recipientPhone - Recipient's phone number.
 * @param {string} question - The question to ask.
 * @param {string} place - The place name to embed in the button ID.
 */
export async function sendInteractiveMessage(wa, recipientPhone, question, place) {
  const interactiveMessage = {
    type: 'button',
    body: { text: question },
    action: {
      buttons: [
        { type: 'reply', reply: { id: 'yes_brochure_action', title: 'Yes' } },
        { type: 'reply', reply: { id: 'no_brochure_action', title: 'No' } }
      ]
    }
  };
  await wa.messages.interactive(interactiveMessage, recipientPhone);
}

const remove_msg = async (incomingMessage, res) => {
    // Check if msg is older than 1 min
    const timestamp_str = incomingMessage.timestamp;
    console.log("timestamp_str", timestamp_str);
    const timestamp = new Date(parseInt(timestamp_str) * 1000); // Convert Unix timestamp to milliseconds
    const current_utc_time = new Date();
    const time_difference = current_utc_time - timestamp;
    const one_minute = 1 * 60 * 1000; // Convert 1 minute to milliseconds
  
    if (time_difference > one_minute) {
      // Data stored successfully
      console.log("remove msg", time_difference);
      return "exit";
    }
  
    return "proceed";
  };
  


  export { remove_msg };

/**
 * Send a WhatsApp video message directly via API.
 * @param {string} recipientPhone - Recipient's phone number.
 * @param {string} caption - Caption or description.
 * @param {string} url - URL of the video.
 * @param {string} filename - Filename for the video.
 * @param {string} accessToken - WhatsApp Cloud API access token.
 * @param {string} senderPhoneNumberId - WhatsApp Business Phone Number ID.
 */
export async function sendVideoMessageDirectly(recipientPhone, caption, url, accessToken, senderPhoneNumberId) {
  const videoMessagePayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "video",
    video: {
      link: url,
      caption: caption,
    }
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${senderPhoneNumberId}/messages`,
      videoMessagePayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    console.log("Video message sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending video message:", error.response?.data || error.message);
    throw error;
  }
}

export async function mark_as_seen(messageid) {

  const data = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageid,
    };
    
    const config = {
      headers: {
        'Authorization': `Bearer ${process.env.ACCESSTOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    
try {
  const response = await axios.post(`https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}/messages`, data, config);
} catch (error) {
  console.error('Error while marking as read:', error?.response?.data);
}
}

/**
 * Filters out phrases related to offering brochures or links from a message using Gemini Flash.
 * @param {string} message - The message to filter.
 * @param {string} GEMINI_API_KEY - The API key for Gemini.
 * @param {string} GEMINI_URL - The URL for Gemini API.
 * @returns {Promise<string>} - The filtered message.
 */
export async function filterGeminiMessage(message,GEMINI_URL) {
  const prompt = `You are given the following message: "${message}".

  Your tasks:
  1. Remove any sentences or phrases that offer a brochure, a link, or a video related to tourism at the place mentioned. This includes variations like:
     - "Would you like a brochure or link?"
     - "Would you like to receive a brochure or link about tourism at this place?"
     - "Would you like to receive a video about tourism at this place?"
     - Or any other similar offers.
  
  2. Improve the formatting of the remaining message:
     - Add appropriate spaces and line breaks between paragraphs or distinct thoughts.
     - Ensure the message is clean and easy to read.
     - Correct minor spacing issues if present (e.g., double spaces, missing spaces after periods).
  
  Output only the cleaned and formatted message text. Do not add any extra explanations or commentary. If no brochure/link/video offers are present, return the original message with improved formatting.`;
  
  const data = {
    contents: {
      role: 'user',
      parts: [{ text: prompt }]
    }
  };

  try {
    const response = await axios.post(GEMINI_URL, data, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini filtering API error:', error.response?.data || error.message);
    // If an error occurs, return the original message to avoid breaking the flow
    return message;
  }
}
