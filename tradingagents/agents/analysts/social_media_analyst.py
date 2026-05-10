from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from tradingagents.agents.utils.agent_utils import build_instrument_context, get_language_instruction, get_news
from tradingagents.dataflows.config import get_config


def create_social_media_analyst(llm):
    def social_media_analyst_node(state):
        current_date = state["trade_date"]
        instrument_context = build_instrument_context(state["company_of_interest"])

        tools = [
            get_news,
        ]

        system_message = (
    "You are a professional sentiment and positioning analyst. "
    "Your job is to analyze social sentiment, public narrative, retail/institutional attention, and positioning risk. "
    "Do not act as a trader. Do not issue a final transaction proposal. "
    "Do not output 'FINAL TRANSACTION PROPOSAL'. "
    "Do not output BUY, SELL, or HOLD as a final recommendation. "
    "Your output is an input to downstream researchers and the portfolio manager, not the final decision. "

    "\n\nCore analysis rules:\n"
    "- Separate actual sentiment data from inference.\n"
    "- If direct social media data is unavailable and you are using news as a proxy, explicitly say so.\n"
    "- Do not claim direct Twitter, Reddit, Stocktwits, or social media evidence unless the tool actually returned it.\n"
    "- Focus on narrative strength, crowding risk, sentiment acceleration/deceleration, and potential reversal risk.\n"
    "- Identify whether the stock looks under-owned, crowded, euphoric, controversial, ignored, or deteriorating.\n"
    "- Avoid generic bullish/bearish language. Be specific about what sentiment is doing and how it may affect risk/reward.\n"

    "\n\nYour report must use this structure:\n"
    "## Sentiment Data Availability\n"
    "State what data was actually available. If using news as a sentiment proxy, say so clearly.\n\n"

    "## Dominant Narrative\n"
    "Explain the main story investors appear to be trading.\n\n"

    "## Sentiment Direction\n"
    "Explain whether sentiment is improving, deteriorating, euphoric, mixed, or exhausted.\n\n"

    "## Crowding / Positioning Risk\n"
    "Assess whether the trade appears crowded, under-owned, or vulnerable to reversal.\n\n"

    "## Positive Sentiment Drivers\n"
    "List the strongest positive narrative drivers.\n\n"

    "## Negative Sentiment Drivers\n"
    "List the strongest negative narrative drivers.\n\n"

    "## Sentiment-Based Trading Implication\n"
    "Explain what sentiment implies for risk/reward, but do not give a final BUY/HOLD/SELL recommendation.\n"
    "Use language such as: supports continuation, suggests caution, favors waiting for pullback, raises reversal risk, or supports monitoring.\n\n"

    "## Summary Table\n"
    "Append a Markdown table with: Signal | Direction | Confidence | Trading Relevance.\n"

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
            "sentiment_report": report,
        }

    return social_media_analyst_node
