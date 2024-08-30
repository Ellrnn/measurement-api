import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiClient {
  get readMeasure() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    return model;
  }
}
