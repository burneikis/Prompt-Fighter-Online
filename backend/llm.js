const OpenAI = require('openai');
require('dotenv').config();

const SYSTEM_PROMPT = `
You are a battle evaluator for a prompt fighting game. Two players have emojis and write prompts to attack the opponent's emoji.

Rules:
- Each player starts with 100 health
- Prompts can deal 0-30 damage to opponent
- Return ONLY a JSON object with this exact structure:
- Reward unique, creative, out-of-the-box or meta prompts.

{
  "player1_damage": <number 0-30>,
  "player2_damage": <number 0-30>
}

- "player1_damage" = damage that Player 1's prompt deals TO Player 2
- "player2_damage" = damage that Player 2's prompt deals TO Player 1
`;

const USER_PROMPT_TEMPLATE = (player1Emoji, player1Prompt, player2Emoji, player2Prompt) => `
Player 1 emoji: ${player1Emoji}
Player 1 prompt: "${player1Prompt}"

Player 2 emoji: ${player2Emoji}
Player 2 prompt: "${player2Prompt}"

Evaluate both prompts and return the damage values.
`;

const DEFAULT_RESPONSE = {
  player1_damage: 5,
  player2_damage: 5
};

// Only initialize OpenAI if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

async function evaluatePrompts(player1Emoji, player1Prompt, player2Emoji, player2Prompt) {
  // Return default values if OpenAI is not available
  if (!openai) {
    return DEFAULT_RESPONSE;
  }

  try {
    // Randomize player positions for LLM evaluation
    const shouldSwap = Math.random() < 0.5;

    let llmPlayer1Emoji, llmPlayer1Prompt, llmPlayer2Emoji, llmPlayer2Prompt;

    if (shouldSwap) {
      // Send Player 2 as "Player 1" to LLM, Player 1 as "Player 2"
      llmPlayer1Emoji = player2Emoji;
      llmPlayer1Prompt = player2Prompt;
      llmPlayer2Emoji = player1Emoji;
      llmPlayer2Prompt = player1Prompt;
    } else {
      // Send in original order
      llmPlayer1Emoji = player1Emoji;
      llmPlayer1Prompt = player1Prompt;
      llmPlayer2Emoji = player2Emoji;
      llmPlayer2Prompt = player2Prompt;
    }

    const userPrompt = USER_PROMPT_TEMPLATE(llmPlayer1Emoji, llmPlayer1Prompt, llmPlayer2Emoji, llmPlayer2Prompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const llmResult = JSON.parse(completion.choices[0].message.content);

    // Decode the results back to original players
    let result;
    if (shouldSwap) {
      // LLM's "Player 1" was actually our Player 2, LLM's "Player 2" was actually our Player 1
      result = {
        player1_damage: llmResult.player2_damage, // Original Player 1 gets damage from LLM's "Player 2" response
        player2_damage: llmResult.player1_damage  // Original Player 2 gets damage from LLM's "Player 1" response
      };
    } else {
      // No swapping needed
      result = llmResult;
    }

    return result;
  } catch (error) {
    console.error('LLM evaluation error:', error);
    return DEFAULT_RESPONSE;
  }
}

module.exports = { evaluatePrompts };