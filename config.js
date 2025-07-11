import WhatsappCloudAPI from 'whatsappcloudapi_wrapper';
import { config as dotenvConfig } from 'dotenv';
import WhatsApp from 'whatsapp';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import OpenAI from 'openai';


import {
  getStorage,
 
} from "firebase/storage";


dotenvConfig();

// Create a WhatsappCloudAPI instance
const whatsapp1 = new WhatsappCloudAPI({
  accessToken: process.env.ACCESSTOKEN,
  senderPhoneNumberId: process.env.WA_PHONE_NUMBER_ID,
  WABA_ID: process.env.WABA_ID,
});

const senderNumber = process.env.WA_PHONE_NUMBER_ID;
const wa = new WhatsApp(senderNumber);

export const useOpenAI = true; // Set to true to use OpenAI, false to use Gemini
export const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
export const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;



const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "zyadha-9c9e0.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: "zyadha-9c9e0.appspot.com",
  messagingSenderId: "329857252578",
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const storage = getStorage(app);
const db = getFirestore(app);



// Export the Supabase client and WhatsappCloudAPI instance
export {whatsapp1,wa,storage,db};
