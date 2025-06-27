import { whatsapp1, wa, useOpenAI, GEMINI_API_KEY, GEMINI_URL } from "./config.js";
import { callGeminiWithFunctions, remove_msg, sendBrochureOrLink, sendInteractiveMessage, mark_as_seen, sendVideoMessageDirectly, filterGeminiMessage } from "./utils.js";
import { callOpenAIWithFunctions } from "./openai_utils.js";

// In-memory chat history per user (phone number)
const chatHistories = {};

const placePdfMap = {
  "alapuzha": "https://tzetpurznmnqatbiarot.supabase.co/storage/v1/object/public/travel-bot//Alappuzha.pdf",
  "fort kochi": "https://tzetpurznmnqatbiarot.supabase.co/storage/v1/object/public/travel-bot//Fort-Kochi.pdf",
  "idukki": "https://tzetpurznmnqatbiarot.supabase.co/storage/v1/object/public/travel-bot//idukki_f.pdf",
  "kozhikode": "https://tzetpurznmnqatbiarot.supabase.co/storage/v1/object/public/travel-bot//kozhikode.pdf",
  "munnar": "https://tzetpurznmnqatbiarot.supabase.co/storage/v1/object/public/travel-bot//Munnar.pdf",
};

const placevideoMap = {
  "alapuzha": "https://tzetpurznmnqatbiarot.supabase.co/storage/v1/object/public/travel-bot//Alapuzha.mp4",
  "fort kochi": "https://tzetpurznmnqatbiarot.supabase.co/storage/v1/object/public/travel-bot//Fort%20Kochi.mp4",
  "idukki": "https://tzetpurznmnqatbiarot.supabase.co/storage/v1/object/public/travel-bot//Idukki.mp4",
  "kozhikode": "https://www.youtube.com/watch?v=llkbgrScts8",
  "munnar": "https://tzetpurznmnqatbiarot.supabase.co/storage/v1/object/public/travel-bot//Munnar.mp4",
};

const signupController = async (req, res) => {

  try {
    let body = whatsapp1.parseMessage(req.body);
    console.log("yaay");

    // console.log("bodyyyyy", body);

    if (body?.isMessage) {
      //console.log("jffff", req.body.entry[0].changes[0].value.messages[0]);

      let incomingMessage = body.message;
      let recipientPhone = incomingMessage.from.phone;
      console.log(recipientPhone);
      let recipientName = incomingMessage.from.name;
      let typeOfMsg = incomingMessage.type;
      let message_id = incomingMessage.message_id;
      let msg = "";

      console.log("incomingMessage", incomingMessage);
      console.log("typeOfMsg", typeOfMsg);
      console.log("message_id", message_id);
      console.log("msg", msg);
      console.log("recipientName", recipientName);
      console.log("recipientPhone", recipientPhone);

      console.log("chatHistories[recipientPhone]", chatHistories[recipientPhone]);
      console.log("chatHistories[recipientPhone].lastPlaceSuggested", chatHistories[recipientPhone]?.lastPlaceSuggested);


      await remove_msg(incomingMessage,res);
      await mark_as_seen(message_id);
      // console.log("Message", incomingMessage.text.body);

      // Only handle text messages
      if (typeOfMsg === "text_message" && incomingMessage.text?.body) {
        const userText = incomingMessage.text.body;
        // Maintain chat history
        if (!chatHistories[recipientPhone]) chatHistories[recipientPhone] = [];
        chatHistories[recipientPhone].push({ role: "user", text: userText });

        // Prepare chat history for Gemini (last 10 turns)
        const history = chatHistories[recipientPhone].slice(-10);
        const geminiPrompt = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');

        const prompt = `${geminiPrompt}

        You are "Maya" 🌸, a friendly, emoji-rich, and professional Kerala travel assistant. Your role is ONLY to assist with **travel-related queries**.
        
        ❗ Strict Behavior Rules:
        
        ✅ General:
        - ONLY answer **travel-related questions**.  
          👉 If user asks anything off-topic, politely say:  
          "Sorry, I can only help with travel-related topics 🌍."
        
        ✅ Introduction:
        - Introduce yourself **once at the start** as "Maya, your Kerala travel assistant" and **never repeat your name again** during the conversation.
        
        ✅ Answer Style:
        - Keep all replies **short, crisp (1-2 lines max)** with the **most important travel info** ✈️🏝️.
        - Use **relevant emojis liberally** to make replies fun and engaging.
        - Stay **to the point**, avoid long explanations or filler text.
        - Absolutely **never** start your replies with "Assistant:", "User:", or any meta labels.
        - when user asks about itinerary or itinerary list,give them the list in proper format.
          eg question: "I need a two day itinery, im landing in kochi for the weekend".
                     "I need a three day itinerary list , as i am visiting kozhikode for the weekend".
          Dont mind the spelling mistakes for the itinerary.
        
        ✅ Question Flow:
        - ONLY ask **5-6 total questions per user conversation**, no more.
        - Do **not ask multiple questions at once**.
        - Keep questions **light, necessary, and surface-level** (no deep probing).
        
        ✅ Tool Call Rules (IMPORTANT):
        - Around the **4th or 5th user turn**, you may decide to use the tool "sent_next_msg_as_interactive_message" 📲 to offer the user a **brochure or tourism link**, BUT:
          - Only trigger this tool for the following 5 places:  
            ["fort kochi", "munnar", "idukki", "alapuzha","kozhikode"].
          - ✅ Use this tool **only if the user has clearly shown interest in one of these places**.
          - ❌ If the user is talking about any other place, **DO NOT call this tool at all**.
        
        ✅ Ending:
        -REMEMBER: After your 5-6 questions, or once the topic is complete, **politely end the chat with a goodbye and thank the user for the conversation 🙏**.
        
        ✅ Tone:
        - Friendly 😊, helpful 💡, and efficient 🕒.  
        - No endless conversations. Stay on-topic and controlled.
        
        Now start the conversation...`;
        
        
       try {
          let aiResponse;
          let functionCall;
          if (useOpenAI) {
            aiResponse = await callOpenAIWithFunctions(prompt);
            console.log("openaiResponse", aiResponse);
            functionCall = aiResponse?.tool_calls?.[0]?.function;
          } else {
            aiResponse = await callGeminiWithFunctions(prompt, GEMINI_URL);
            console.log("geminiResponse", aiResponse);
            const candidate = aiResponse?.candidates?.[0];
            console.log("candidate", candidate);
            console.log("candidate.content.parts[0]", candidate?.content?.parts?.[0]);
            functionCall = candidate?.content?.parts?.find(
              part => part.functionCall && (
                part.functionCall.name === "sent_message" ||
                part.functionCall.name === "sent_next_msg_as_interactive_message"
              )
            )?.functionCall;
          }

          // Prefer function call output if present
          let replyText = "";
          
          if (functionCall) {

            console.log("functionCallname", functionCall.name);
            const args = useOpenAI ? JSON.parse(functionCall.arguments) : functionCall.args;

            if (functionCall.name === "sent_message" && args?.message) {
              replyText = await filterGeminiMessage(args.message, GEMINI_URL);
              await wa.messages.text({ body: replyText, preview_url: false }, recipientPhone);
              chatHistories[recipientPhone].push({ role: "assistant", text: replyText });
            } else if (functionCall.name === "sent_next_msg_as_interactive_message") {
              // Use the appropriate model's custom msg for the interactive message and place for button customization
              const question = args?.msg || `Would you like to receive a brochure or link about tourism at ${args?.place || 'this place'}?`;
              if (args?.place && question) {
                await sendInteractiveMessage(wa, recipientPhone, question, args.place);
                chatHistories[recipientPhone].push({ role: "assistant", text: question });
                chatHistories[recipientPhone].lastPlaceSuggested = args.place;
              } else {
                await wa.messages.text({ body: "Sorry, I couldn't process your request.", preview_url: false }, recipientPhone);
                chatHistories[recipientPhone].push({ role: "assistant", text: "Sorry, I couldn't process your request." });
              }
            }
          } else if (useOpenAI && aiResponse?.content) {
            replyText = await filterGeminiMessage(aiResponse.content, GEMINI_URL);
            await wa.messages.text({ body: replyText, preview_url: false }, recipientPhone);
            chatHistories[recipientPhone].push({ role: "assistant", text: replyText });
          } else if (!useOpenAI && aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text) {
            replyText = await filterGeminiMessage(aiResponse.candidates[0].content.parts[0].text, GEMINI_URL);
            await wa.messages.text({ body: replyText, preview_url: false }, recipientPhone);
            chatHistories[recipientPhone].push({ role: "assistant", text: replyText });
          }else {
            console.log("[DEBUG] Gemini response has no function call or text content in expected format:", JSON.stringify(aiResponse));
            await wa.messages.text({ body: "Sorry, I couldn't process your request.", preview_url: false }, recipientPhone);
            chatHistories[recipientPhone].push({ role: "assistant", text: "Sorry, I couldn't process your request." });
          }
        } catch (err) {
          const errorMessage = `AI error: ${err.message || "Unknown error"}`;
          await wa.messages.text({ body: errorMessage, preview_url: false }, recipientPhone);
          chatHistories[recipientPhone].push({ role: "assistant", text: errorMessage });
        }
      }

      // Handle interactive button replies and free-text 'yes' replies
      if ((typeOfMsg === "simple_button_message" && incomingMessage.button_reply?.id) ) {
        console.log("[DEBUG] Entered button/text reply handler");
        let buttonId = null;
        if (typeOfMsg === "simple_button_message") {
          buttonId = incomingMessage.button_reply.id;
          console.log("[DEBUG] simple_button_message buttonId:", buttonId);
        } else if (typeOfMsg === "text_message") {
          buttonId = "yes_brochure";
          console.log("[DEBUG] text_message treated as yes_brochure");
        }
        if (!chatHistories[recipientPhone]) chatHistories[recipientPhone] = [];
        // Add the button reply or text reply to chat history
        const userReplyText = typeOfMsg === "simple_button_message" ? incomingMessage.button_reply.title : incomingMessage.text.body;
        chatHistories[recipientPhone].push({ role: "user", text: userReplyText });
        // Try to extract the last place offered from the assistant's last interactive message
        let lastPlace = null;
        if (chatHistories[recipientPhone].lastPlaceSuggested) {
          lastPlace = chatHistories[recipientPhone].lastPlaceSuggested;
          console.log("[DEBUG] Found lastPlace in chat history (from stored):", lastPlace);
        } else {
          for (let i = chatHistories[recipientPhone].length - 1; i >= 0; i--) {
            const entry = chatHistories[recipientPhone][i];
            if (entry.role === "assistant" && entry.text && entry.text.toLowerCase().includes("brochure") && entry.text.toLowerCase().match(/fort kochi|munnar|idukki|alapuzha|alappuzha|kozhikode/)) {
              lastPlace = (entry.text.match(/fort kochi|munnar|idukki|alapuzha|alappuzha|kozhikode/i) || [])[0];
              console.log("[DEBUG] Found lastPlace in chat history (from scan):", lastPlace);
              break;
            }
          }
        }
        
        if (buttonId === "yes_brochure_action" || (buttonId === "yes_brochure" && lastPlace)) {
          console.log("[DEBUG] Sending brochure for place:", lastPlace);
          // Send the travel brochure PDF for the last place
          const place = lastPlace || "this place";
          const caption = `🌟 Here's your travel brochure for ${place}! 🗺️✨ Let me know if you'd like more tips or info! 😊`
          const brochureUrl = placePdfMap[place.toLowerCase()];
          const filename = `${place.replace(/\s+/g, '_')}.pdf`; // Generate filename from place
          await sendBrochureOrLink(wa, recipientPhone, caption, brochureUrl, filename);
          chatHistories[recipientPhone].push({ role: "assistant", text: caption });
          chatHistories[recipientPhone].lastPlaceSuggested = place; // Update lastPlaceSuggested for video
        } else if (buttonId === "no_brochure_action" || (buttonId && buttonId.toLowerCase().includes("no"))) {
          console.log("[DEBUG] User declined brochure");
          const replyText = "👍 Okay! Let me know if you need anything else for your trip! ✈️😊";
          await wa.messages.text({ body: replyText, preview_url: false }, recipientPhone);
          chatHistories[recipientPhone].push({ role: "assistant", text: replyText });
        } else if (buttonId === "yes_video_action" && lastPlace) {
          console.log("[DEBUG] Sending video for place:", lastPlace);
          const place = lastPlace || "this place";
          const caption = `📸 Here's your travel video for ${place}! 🎥🌿 Hope you enjoy the vibes! 😄`;
          const videoUrl = placevideoMap[place.toLowerCase()];
          
          if (place.toLowerCase() === "kozhikode") {
            const message = {
              body: videoUrl,
              preview_url: true,
            };
            await wa.messages.text(message, recipientPhone);
            chatHistories[recipientPhone].push({ role: "assistant", text: `Sent video link for ${place}: ${videoUrl}` });
          } else {
            const accessToken = process.env.ACCESSTOKEN;
            const senderPhoneNumberId = process.env.WA_PHONE_NUMBER_ID;
            await sendVideoMessageDirectly(recipientPhone, caption, videoUrl, accessToken, senderPhoneNumberId);
            chatHistories[recipientPhone].push({ role: "assistant", text: caption });
          }
        } else if (buttonId === "no_video_action" || (buttonId && buttonId.toLowerCase().includes("no_video"))) {
          console.log("[DEBUG] User declined video");
          const replyText = "✅ No problem at all! Just let me know if you need anything else for your trip! 🌍✨";
          await wa.messages.text({ body: replyText, preview_url: false }, recipientPhone);
          chatHistories[recipientPhone].push({ role: "assistant", text: replyText });
        } else {
          console.log("[DEBUG] Button/text reply did not match any expected branch", buttonId);
        }
        return "end";
      }

    }

    return "end";
  } catch (error) {
    console.log("first tryyyy", error);

    const message = {
      body: "some technical error ⚙🔧",
      preview_url: false,
    };

    await wa.messages.text(message, incomingMessage.from.phone);

    return "first_error";
  }
};

export { signupController };
