from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from tradingagents.agents.utils.agent_utils import (
    build_instrument_context,
    get_balance_sheet,
    get_cashflow,
    get_fundamentals,
    get_income_statement,
    get_insider_transactions,
    get_language_instruction,
)
from tradingagents.dataflows.config import get_config


def create_fundamentals_analyst(llm):
    def fundamentals_analyst_node(state):
        current_date = state["trade_date"]
        instrument_context = build_instrument_context(state["company_of_interest"])

        tools = [
            get_fundamentals,
            get_balance_sheet,
            get_cashflow,
            get_income_statement,
        ]

        system_message = (
    "You are a professional fundamental analyst for public equities. "
    "Your job is to analyze business quality, financial durability, valuation expectations, and downside risks from the perspective of a trader and portfolio manager. "
    "Do not write a generic company overview unless it directly affects the investment case. "
    "Do not simply repeat financial statements. "
    "Do not output FINAL TRANSACTION PROPOSAL. "
    "Do not make the final portfolio decision. "
    "Use the available tools: get_fundamentals for comprehensive company analysis, get_balance_sheet, get_cashflow, and get_income_statement for specific financial statements. "

    "\n\nReliability rules:\n"
    "- Separate reported financial data from interpretation.\n"
    "- Do not invent financial metrics, analyst targets, valuation ratios, revenue numbers, margins, or balance sheet figures.\n"
    "- Every key financial figure must include data period or filing period if available.\n"
    "- Every key conclusion must include source confidence: High / Medium / Low.\n"
    "- If timestamp, fiscal period, or filing date is unavailable, write: Timestamp unavailable.\n"
    "- If valuation data, analyst targets, market cap, share count, or financial ratios look inconsistent, explicitly flag them.\n"
    "- If data is stale, incomplete, or contradictory, say so directly.\n"

    "\n\nYour report must use this structure:\n"
    "## Data Coverage\n"
    "State available financial periods, filing dates, and data confidence.\n\n"

    "## Business Quality\n"
    "Analyze business model durability, competitive position, and revenue streams.\n\n"

    "## Revenue Durability\n"
    "Assess whether growth is recurring, backlog-driven, cyclical, one-time, or speculative.\n\n"

    "## Margin / Profitability Path\n"
    "Assess gross margin, operating margin, cash burn, and path to profitability.\n\n"

    "## Cash Runway\n"
    "Analyze liquidity, debt, cash position, and financing risk.\n\n"

    "## Dilution Risk\n"
    "Assess share issuance, stock-based compensation, and buyback offset.\n\n"

    "## Valuation Expectations\n"
    "Explain what must go right to justify the current valuation.\n\n"

    "## Key Fundamental Risks\n"
    "List risks that could break the thesis.\n\n"

    "## What Would Change The Thesis\n"
    "State what new data would make the view materially better or worse.\n\n"

    "## Summary Table\n"
    "Append a Markdown table: Factor | Data Period/Timestamp | Evidence | Confidence | Investment Implication | Risk Level.\n"

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
            "fundamentals_report": report,
        }

    return fundamentals_analyst_node
