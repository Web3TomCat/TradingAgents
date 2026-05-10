from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from tradingagents.agents.utils.agent_utils import (
    build_instrument_context,
    get_global_news,
    get_language_instruction,
    get_news,
)
from tradingagents.dataflows.config import get_config


def create_news_analyst(llm):
    def news_analyst_node(state):
        current_date = state["trade_date"]
        instrument_context = build_instrument_context(state["company_of_interest"])

        tools = [
            get_news,
            get_global_news,
        ]

        system_message = (
    "You are a professional market news analyst. "
    "Your job is to analyze recent company-specific news, sector news, and macro news from the perspective of a trader. "
    "Do not write a generic news summary. "
    "Do not output FINAL TRANSACTION PROPOSAL. "
    "Do not make the final portfolio decision. "
    "Use the available tools: get_news(query, start_date, end_date) for company-specific or targeted news searches, and get_global_news(curr_date, look_back_days, limit) for broader macroeconomic news. "

    "\n\nReliability rules:\n"
    "- Separate verified facts from interpretation.\n"
    "- Do not invent macro events, contracts, analyst targets, earnings numbers, geopolitical events, or policy changes.\n"
    "- Every major claim should include source confidence: High / Medium / Low.\n"
    "- Every major claim should include data timestamp or publication date if available.\n"
    "- If source date is unavailable, write: Timestamp unavailable.\n"
    "- If source confidence is low, explicitly mark it as low-confidence.\n"
    "- If news data is stale, incomplete, or contradictory, say so directly.\n"

    "\n\nYour report must use this structure:\n"
    "## Data Coverage\n"
    "State the search window, available sources, and whether the data appears complete or incomplete.\n\n"

    "## Verified News\n"
    "List key company-specific and macro news. For each item include: source, timestamp/date, and confidence.\n\n"

    "## Market Narrative\n"
    "Explain what story the market is likely trading.\n\n"

    "## What The Market May Be Pricing In\n"
    "Explain which expectations may already be reflected in the stock price.\n\n"

    "## Potential Catalysts\n"
    "List 1-8 week catalysts. Include expected timing and confidence.\n\n"

    "## Risks / Low-confidence Claims\n"
    "List uncertain, unverified, stale, or potentially exaggerated claims.\n\n"

    "## News-Based Trading Implication\n"
    "Explain whether news supports continuation, caution, pullback risk, or monitoring. Do not give final BUY/HOLD/SELL.\n\n"

    "## Summary Table\n"
    "Append a Markdown table: News Item | Source | Date/Timestamp | Confidence | Expected Impact | Trading Relevance.\n"

    + get_language_instruction()
)
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a helpful AI assistant, collaborating with other assistants."
                    " Use the provided tools to progress towards answering the question."
                    " If you are unable to fully answer, that's OK; another assistant with different tools"
                    " will help where you left off. Execute what you can to make progress."
                    " You have access to the following tools: {tool_names}.\n{system_message}"
                    "For your reference, the current date is {current_date}. {instrument_context}",
                ),
                MessagesPlaceholder(variable_name="messages"),
            ]
        )

        prompt = prompt.partial(system_message=system_message)
        prompt = prompt.partial(tool_names=", ".join([tool.name for tool in tools]))
        prompt = prompt.partial(current_date=current_date)
        prompt = prompt.partial(instrument_context=instrument_context)

        chain = prompt | llm.bind_tools(tools)
        result = chain.invoke(state["messages"])

        report = ""

        if len(result.tool_calls) == 0:
            report = result.content

        return {
            "messages": [result],
            "news_report": report,
        }

    return news_analyst_node
