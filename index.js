import { GoogleGenAI } from "@google/genai";
const API_KEY = 'AQ.Ab8RN6IF0bj3DxZjMcwkNUPAJPFy9gWCp8EV4MGfCc86mlzhGA';

const ai = new GoogleGenAI({apikey: API_KEY });

const interaction = await ai.interactions.create({
  model: "gemini-2.5-flash-lite",
  input: "Explain how AI works in a few words",
});

console.log(interaction.output_text);