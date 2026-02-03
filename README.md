# Invex Crew
🚀 Invex — Multi-Agent AI Support System (with crewAI)

Invex is a configurable multi-agent AI system built using the crewAI framework. It allows a crew of intelligent agents to collaboratively solve complex tasks defined in configuration files. The agents communicate, reason, and produce outputs like research reports using LLMs.

🧠 Table of Contents

🔍 About the Project

🛠️ Tech Stack

🧱 Architecture Overview

📦 Installation

▶️ How to Run

🧩 Configuration

🧠 What I Learned

📊 Metrics & Evaluation

🚀 Future Improvements

📁 Project Structure

🤝 Contribution & Support

🔍 About the Project

Invex Crew is a template project powered by crewAI that demonstrates a multi-agent collaboration system. Each agent is defined with a role, goals, and optionally tools, and they work together to complete user-defined tasks by leveraging large language models.

Example use cases include:

AI research automation

Multi-agent reasoning workflows

Report generation

Intelligent task delegation

🛠️ Tech Stack
Layer	Technology
Language	Python (3.10–3.13)
AI Orchestration	crewAI
LLM Integration	OpenAI / other models
Config Files	YAML
Dependency Management	UV
Output	Markdown or other artifacts

This setup gives you flexibility to integrate with vector DBs, external APIs, tool-enabled agents, and more.

🧱 Architecture Overview

Invex follows a config-driven multi-agent pipeline:

User Input
   ↓
crewAI Runner
   ↓
Agent Config (agents.yaml)
   ↓
Task Config (tasks.yaml)
   ↓
Agent Instantiation
   ↓
LLM + Reasoning Layer
   ↓
Collaborative Execution
   ↓
Results (e.g., report.md)


Each agent encapsulates domain logic and can use external tools, knowledge bases, or retrieval systems.

📦 Installation

Make sure you have Python (3.10–3.13) installed.

Install UV:

pip install uv


Navigate to the project:

cd invex


Install dependencies:

uv install


Create .env and set:

OPENAI_API_KEY=your_api_key_here

▶️ How to Run

To start the Invex crew and execute tasks:

crewai run


Once executed, this will run all agents as defined in src/invex/config/agents.yaml and src/invex/config/tasks.yaml. It produces outputs such as reports or summaries in the outputs/ directory.

🧩 Configuration
🧠 Agents

Edit:

src/invex/config/agents.yaml


Define each agent’s role, goals, and capabilities.

📋 Tasks

Edit:

src/invex/config/tasks.yaml


Specify tasks for agents to perform collaboratively.

🧠 What I Learned

Working on this project helped me understand:

Multi-agent orchestration with crewAI

Config-driven system design

Prompt chaining and workflow automation

Structuring AI pipelines for scalability

Managing LLM API integration and prompts

Debugging complex multi-agent flows

📊 Evaluation & Metrics

Instead of traditional “accuracy,” this kind of system is evaluated using:

📌 Task Completion Rate

Percentage of tasks successfully executed.

📌 Relevance & Quality Score

Human or automated rating of how coherent and useful the outputs are.

📌 Latency

Average time to complete tasks.

Sample metrics to include after testing:

Metric	Value
Task Completion	90%
Output Quality	4.5 / 5
Avg Response Time	2.8 sec

These estimates help you benchmark performance and chemistry among agents.

🚀 Future Improvements

Here’s how Invex can be improved:

Add persistent agent memory

Connection to vector databases for RAG support

Add tool invocation (web search, code execution, calculators)

Streaming response support

Web or UI interface

Support for more LLM providers

Benchmarking suite for metrics

These value additions boost performance, usability, and real-world adoption.

📁 Project Structure
invex/
├── knowledge/           # Static knowledge files
├── outputs/             # Generated outputs (reports, files)
├── src/
│   └── invex/
│       ├── config/
│       │   ├── agents.yaml
│       │   └── tasks.yaml
│       ├── crew.py
│       └── main.py
├── .gitignore
├── run_interactive.py
├── requirements.txt
├── uv.lock
└── README.md

🤝 Contribution & Support

Contributions are welcome! 🚀

Whether it’s improving agent logic, adding new tasks, or integrating with new tools — feel free to:

Open issues

Submit pull requests

Add documentation

For support:

Visit the crewAI documentation

Join the crewAI Discord

Check out community examples
