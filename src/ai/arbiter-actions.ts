// Server Action to process AI Arbitration on the server
"use server"

import { arbiterFlow } from '@/ai/genkit';

export async function processAiArbitration(input: {
  screenshot_url: string;
  p1_name: string;
  p2_name: string;
  is_plus_user: boolean;
}) {
  try {
    const result = await arbiterFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('AI Arbiter Server Action Error:', error);
    return { success: false, error: 'Failed to process AI arbitration' };
  }
}
