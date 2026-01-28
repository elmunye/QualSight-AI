## QualiSight AI
QualiSight AI is an Agentic Research Assistant that automates the transition from raw text to coded, organized qualitative data. It also includes an analysis and reporting module. For researchers who want maintain control of narrative and analysis of qualitative data, like me, the coded dataset is the most important output of this tool.

## Core Pillars

1. Privacy-First Design: Data is processed via Google Cloud infrastructure and fed into Gemini 1.5 Flash and Pro. In the future, I will adapt this tool so that it can be used with open source, local LLMs.

2. Human-Centered Control: Unlike "Black Box" tools, QualiSight provides a Sampling & Correction Phase. Researchers can audit the AI’s initial coding and provide "few shot examples" that the dedicated agent can learn from before it codes the entire dataset. Researchers can also over-rule an agent's proposed thematic taxonomy and provide their own labels.

## Getting Started (For Developers)

1. npm install
2. npm run build
3. Set GOOGLE_GENERATIVE_AI_API_KEY in environment.
4. npm start (Runs on Port 8080).

## Roadmap
More to come soon!
