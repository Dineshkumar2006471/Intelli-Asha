import { GoogleGenAI } from '@google/genai';

process.env.GOOGLE_CLOUD_PROJECT = 'kavach-hackathon-500511';

// Method 1: Delete env var
const original = process.env.GOOGLE_CLOUD_PROJECT;
delete process.env.GOOGLE_CLOUD_PROJECT;
const ai1 = new GoogleGenAI({ apiKey: 'dummy' });
process.env.GOOGLE_CLOUD_PROJECT = original;

console.log("ai1 project:", ai1.apiClient.clientOptions.project);

// Method 2: pass undefined?
const ai2 = new GoogleGenAI({ apiKey: 'dummy', project: undefined });
console.log("ai2 project:", ai2.apiClient.clientOptions.project);
