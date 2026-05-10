from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from tradingagents.agents.utils.agent_utils import (
    build_instrument_context,
    get_indicators,
    get_language_instruction,
    get_stock_data,
)
from tradingagents.dataflows.config import get_config


def create_market_analyst(llm):

    def market_analyst_node(state):
        current_date = state["trade_date"]
        instrument_context = build_instrument_context(state["company_of_interest"])

        tools = [
            get_stock_data,
            get_indicators,
        ]

        system_message = (
    "You are a professional market structure analyst. "
    "Your job is not to explain technical indicators, but to convert price action into actionable trading context. "
    "Use at most 2 technical indicators. Prefer one trend indicator and one risk/momentum indicator. "
    "Do not write textbook explanations of RSI, MACD, Bollinger Bands, SMA, EMA, or ATR. "
    "Do not output FINAL TRANSACTION PROPOSAL. "
    "Do not make the final portfolio decision. "

    "\n\nYour report must be concise and structured as follows:\n"

    "## Trend Regime\n"
    "Classify the stock as: uptrend, downtrend, range-bound, breakout, failed breakout, or exhaustion risk.\n\n"

    "## Breakout / Pullback Quality\n"
    "Explain whether the current move is a clean breakout, extended breakout, failed breakout, healthy pullback, or no setup.\n\n"

    "## Positioning Risk\n"
    "Explain whether the stock looks crowded, extended, under-owned, or still early.\n\n"

    "## Chasing Risk\n"
    "State whether buying now is chasing. Be direct.\n\n"

    "## Key Levels\n"
    "Provide only the most important support, resistance, and invalidation level.\n\n"

    "## Better Entry Zone\n"
    "Give a better entry zone or condition for entry.\n\n"

    "## Market Structure Implication\n"
    "Explain the trading implication without giving a final BUY/HOLD/SELL decision.\n"
    "Use language such as: trend supports holding, wait for pullback, avoid chasing, trim into strength, or monitor breakout confirmation.\n"

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
            "market_report": report,
        }

    return market_analyst_node
