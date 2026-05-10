

def create_bull_researcher(llm):
    def bull_node(state) -> dict:
        investment_debate_state = state["investment_debate_state"]
        history = investment_debate_state.get("history", "")
        bull_history = investment_debate_state.get("bull_history", "")

        current_response = investment_debate_state.get("current_response", "")
        market_research_report = state["market_report"]
        sentiment_report = state["sentiment_report"]
        news_report = state["news_report"]
        fundamentals_report = state["fundamentals_report"]

        prompt = f"""
        Data sufficiency rule:
If the provided reports show missing price data, missing fundamentals, missing news, or an invalid ticker, do not fabricate a bullish thesis.
If core data is missing, your conclusion must be:
"No valid long thesis due to insufficient verified data."
Do not argue that absence of data is bullish.
Do not treat an information vacuum as an opportunity.
The burden of proof is on the long thesis.

You are a professional buy-side Bull Analyst. Your job is not to be optimistic by default, but to build the strongest possible long thesis if the evidence supports it.

Think like a portfolio manager, not a financial blogger.

Your bull case must focus on:
1. What the market is currently pricing in.
2. What the market may still be underpricing.
3. The strongest forward-looking narrative.
4. Upcoming catalysts in the next 1–8 weeks.
5. Evidence of improving expectations, positioning, sentiment, or fundamentals.
6. Why bears may be too focused on backward-looking data.
7. What would invalidate the bull thesis.

Do not overuse generic technical indicators such as RSI, MACD, SMA unless they directly affect positioning, risk/reward, or timing.

Your argument should include these sections:

## Bull Thesis
State the strongest long thesis in 3–5 sentences.

## What The Market Is Pricing In
Explain the current consensus expectation.

## Variant Perception
Explain what the market may be missing.

## Catalysts
List near-term catalysts that could force repricing.

## Evidence
Use concrete evidence from the reports below.

## Response To Bear Case
Directly refute the latest bear argument, if available.

## Invalidation
Clearly state what would prove the bull case wrong.

## Trading Implication
Explain whether this supports Buy, Overweight, Hold, or waiting for a better entry.

Resources available:

Market research report:
{market_research_report}

Social media sentiment report:
{sentiment_report}

Latest world affairs news:
{news_report}

Company fundamentals report:
{fundamentals_report}

Conversation history of the debate:
{history}

Last bear argument:
{current_response}
"""

        response = llm.invoke(prompt)

        argument = f"Bull Analyst: {response.content}"

        new_investment_debate_state = {
            "history": history + "\n" + argument,
            "bull_history": bull_history + "\n" + argument,
            "bear_history": investment_debate_state.get("bear_history", ""),
            "current_response": argument,
            "count": investment_debate_state["count"] + 1,
        }

        return {"investment_debate_state": new_investment_debate_state}

    return bull_node
