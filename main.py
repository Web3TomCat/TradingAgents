from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG
from dotenv import load_dotenv
from pathlib import Path
import json
from datetime import datetime


# Load environment variables from .env file
load_dotenv()

# Output directory
output_dir = Path("outputs")
output_dir.mkdir(exist_ok=True)

# Create a custom config
config = DEFAULT_CONFIG.copy()

# LLM config
config["llm_provider"] = "deepseek"
config["deep_think_llm"] = "deepseek-chat"
config["quick_think_llm"] = "deepseek-chat"
config["max_debate_rounds"] = 1

# Analysts config
# 可选值: ["market", "news", "fundamentals",  "social"]
config["analysts"] = ["market"]

# Data vendors
config["data_vendors"] = {
    "core_stock_apis": "alpha_vantage",
    "technical_indicators": "alpha_vantage",
    "fundamental_data": "alpha_vantage",
    "news_data": "alpha_vantage",


   #   "core_stock_apis": "yfinance",
    # "technical_indicators": "yfinance",
    # "fundamental_data": "alpha_vantage",
    # "news_data": "alpha_vantage",

}

# Initialize with custom config
ta = TradingAgentsGraph(debug=True, config=config)

# Stocks to analyze
tickers = ["AMZN"]

# Trade date
trade_date = "2026-05-10"

for ticker in tickers:
    print("=" * 80)
    print(f"Analyzing {ticker}")
    print("=" * 80)

    try:
        state, decision = ta.propagate(ticker, trade_date)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        md_file = output_dir / f"{ticker}_{trade_date}_{timestamp}_report.md"
        json_file = output_dir / f"{ticker}_{trade_date}_{timestamp}_state.json"

        # 保存完整 state，方便你后续研究所有字段
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2, ensure_ascii=False, default=str)

        # 保存更适合阅读的 Markdown 报告
        with open(md_file, "w", encoding="utf-8") as f:
            f.write(f"# {ticker} TradingAgents Report\n\n")
            f.write(f"- Ticker: {ticker}\n")
            f.write(f"- Trade Date: {trade_date}\n")
            f.write(f"- Generated At: {timestamp}\n\n")

            f.write("---\n\n")

            f.write("## Final Decision\n\n")
            f.write(str(decision))
            f.write("\n\n")

            sections = [
                ("Market Report", "market_report"),
                ("Social Sentiment Report", "sentiment_report"),
                ("News Report", "news_report"),
                ("Fundamentals Report", "fundamentals_report"),
                ("Bull/Bear Investment Debate", "investment_debate_state"),
                ("Trader Investment Plan", "trader_investment_plan"),
                ("Risk Debate", "risk_debate_state"),
                ("Final Trade Decision", "final_trade_decision"),
            ]

            for title, key in sections:
                value = state.get(key, "")

                if value:
                    f.write("---\n\n")
                    f.write(f"## {title}\n\n")
                    f.write(str(value))
                    f.write("\n\n")

            f.write("---\n\n")
            f.write("## Available State Keys\n\n")
            for key in state.keys():
                f.write(f"- {key}\n")

        print(f"Saved markdown report to: {md_file}")
        print(f"Saved raw state json to: {json_file}")

    except Exception as e:
        error_file = output_dir / f"{ticker}_{trade_date}_error.txt"

        with open(error_file, "w", encoding="utf-8") as f:
            f.write(str(e))

        print(f"{ticker} failed: {e}")
        print(f"Saved error to: {error_file}")

# Memorize mistakes and reflect
# ta.reflect_and_remember(1000) # parameter is the position returns

