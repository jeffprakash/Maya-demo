import axios from "axios";
import FormData from "form-data";
import { storage,wa } from "./config.js";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const manage_audio = async (incomingMessage) => {
  const messageid = incomingMessage.audio.id;
  const accessToken = process.env.CLOUD_API_ACCESS_TOKEN;

  console.log("msgid", messageid);

  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://graph.facebook.com/v17.0/${messageid}`,
    headers: {
      Authorization: `Bearer ${process.env.CLOUD_API_ACCESS_TOKEN}`,
    },
  };

  const response = await axios.request(config);

  const meta_media_url = response.data.url;

  console.log("meta_media_url", meta_media_url);

//   const message = {
//     body: "Umm, Zyadha is thinking....🤔💭",
//     preview_url: false,
//   };

// await  wa.messages.text(message, incomingMessage.from.phone);

  const resp = await axios.get(meta_media_url, {
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const media = resp.data;
  const bytes = new Uint8Array(media);

  const storageRef = ref(storage, `audio/${messageid}`);
  const metadata = {
    contentType: "audio/mp3",
  };
  let transcript;





  await uploadBytes(storageRef, bytes, metadata).then(async (snapshot) => {
    console.log("Uploaded an array!");
    const firebase_url = await getDownloadURL(storageRef);
    //console.log(firebase_url);
    const fileSizeBytes = snapshot.metadata.size;

    if (fileSizeBytes > 30000) {
      transcript = "audio_too_large";
      return transcript;
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Replace with your OpenAI API key

    const audioURL = firebase_url;
    console.log(audioURL);
    const formData = new FormData();
    const response = await axios.get(audioURL, { responseType: "stream" });
    

    formData.append("file", response.data);
    formData.append("model", "whisper-1");

   
    const text = await axios.post(
      "https://api.openai.com/v1/audio/translations",
      formData,
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
      }
    );

    transcript = text.data.text;
    console.log("resultttttttttt", transcript);
  });

  console.log("uuufff");
  return transcript;
};

export { manage_audio };