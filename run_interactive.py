#!/usr/bin/env python3
"""
Interactive runner for Invex with custom user inputs
"""
import sys
import os
from datetime import datetime

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from invex.crew import Invex

def main():
    print("🚀 Welcome to Invex - Dynamic Asset Allocation Intelligence Agent\n")
    
    try:
        # Get user inputs interactively
        capital = float(input("💰 Enter your investment amount (₹): "))
        
        print("\n📊 Select your risk tolerance:")
        print("1. Conservative (Low risk, stable returns)")
        print("2. Moderate (Balanced risk-reward)")
        print("3. Aggressive (High risk, high potential returns)")
        risk_choice = input("Enter choice (1/2/3): ")
        
        risk_map = {"1": "conservative", "2": "moderate", "3": "aggressive"}
        risk_tolerance = risk_map.get(risk_choice, "moderate")
        
        investment_horizon = input("\n⏰ Investment horizon (e.g., '3 years', '5 years'): ")
        
        # Prepare inputs
        inputs = {
            'capital_amount': capital,
            'risk_tolerance': risk_tolerance,
            'investment_horizon': investment_horizon,
            'current_date': datetime.now().strftime("%Y-%m-%d")
        }
        
        print(f"\n🔍 Analyzing markets for ₹{capital:,.0f} with {risk_tolerance} risk profile...")
        print(f"📅 Analysis Date: {inputs['current_date']}")
        print(f"⏳ Investment Horizon: {investment_horizon}\n")
        
        # Execute the crew
        result = Invex().crew().kickoff(inputs=inputs)
        
        # Save output
        output_dir = "outputs"
        os.makedirs(output_dir, exist_ok=True)
        output_file = f"{output_dir}/invex_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(str(result))
        
        print(f"\n✅ Investment report generated successfully!")
        print(f"📄 Report saved to: {output_file}\n")
        print("=" * 80)
        print(result)
        print("=" * 80)
        
    except KeyboardInterrupt:
        print("\n\n❌ Operation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
