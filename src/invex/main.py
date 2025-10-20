#!/usr/bin/env python3
import sys
import os
import re
from datetime import datetime
from invex.crew import Invex

def get_user_inputs() -> dict:
    """
    Interactively collect user investment preferences
    """
    print("\n" + "="*80)
    print("💰 INVEX - Dynamic Asset Allocation Intelligence Agent")
    print("="*80 + "\n")
    
    # Investment Amount
    while True:
        try:
            amount = float(input("💵 How much money do you want to invest? (₹): "))
            if amount >= 10000:
                break
            else:
                print("❌ Minimum investment amount is ₹10,000")
        except ValueError:
            print("❌ Please enter a valid number")
    
    # Risk Percentage
    while True:
        try:
            risk_pct = int(input("\n📊 What percentage of risk are you willing to take? (0-100%): "))
            if 0 <= risk_pct <= 100:
                # Map to risk category
                if risk_pct <= 30:
                    risk_category = 'conservative'
                elif risk_pct <= 60:
                    risk_category = 'moderate'
                else:
                    risk_category = 'aggressive'
                break
            else:
                print("❌ Risk percentage must be between 0 and 100")
        except ValueError:
            print("❌ Please enter a valid number")
    
    # Expected Returns
    while True:
        try:
            expected_returns = float(input("\n📈 What percentage of annual returns do you expect? (e.g., 12, 15, 20): "))
            if expected_returns > 0:
                break
            else:
                print("❌ Expected returns must be positive")
        except ValueError:
            print("❌ Please enter a valid number")
    
    # Investment Duration
    while True:
        try:
            duration = int(input("\n⏰ For how long do you want to invest? (years): "))
            if duration >= 1:
                break
            else:
                print("❌ Investment duration must be at least 1 year")
        except ValueError:
            print("❌ Please enter a valid number")
    
    # Asset Preferences
    print("\n🎯 Which asset classes do you want to include?")
    print("   1. Stocks (Indian equity stocks from NSE)")
    print("   2. Mutual Funds (Professionally managed funds)")
    print("   3. Gold (SGBs, Gold ETFs)")
    print("   4. Cryptocurrency (Bitcoin, Ethereum, etc.)")
    print("\n   Enter your choices as comma-separated numbers (e.g., '1,2,3')")
    print("   Or type 'all' to include all asset classes")
    
    while True:
        pref_input = input("\n   Your choices: ").strip().lower()
        
        if pref_input == 'all':
            preferences = {'stocks': True, 'mutual_funds': True, 'gold': True, 'crypto': True}
            break
        else:
            try:
                choices = [int(x.strip()) for x in pref_input.split(',')]
                if all(1 <= c <= 4 for c in choices):
                    preferences = {
                        'stocks': 1 in choices,
                        'mutual_funds': 2 in choices,
                        'gold': 3 in choices,
                        'crypto': 4 in choices
                    }
                    break
                else:
                    print("❌ Please enter numbers between 1 and 4")
            except ValueError:
                print("❌ Invalid input. Please enter comma-separated numbers or 'all'")
    
    # Display summary and confirm
    print("\n" + "="*80)
    print("📋 REVIEW YOUR INVESTMENT PREFERENCES")
    print("="*80)
    print(f"\n💵 Investment Amount: ₹{amount:,.0f}")
    print(f"📊 Risk Tolerance: {risk_pct}% ({risk_category})")
    print(f"📈 Expected Returns: {expected_returns}% annually")
    print(f"⏰ Investment Duration: {duration} years")
    print(f"\n🎯 Selected Asset Classes:")
    if preferences['stocks']:
        print("   ✅ Stocks")
    if preferences['mutual_funds']:
        print("   ✅ Mutual Funds")
    if preferences['gold']:
        print("   ✅ Gold")
    if preferences['crypto']:
        print("   ✅ Cryptocurrency")
    print("\n" + "="*80)
    
    confirm = input("\n✅ Proceed with these settings? (yes/no): ").strip().lower()
    if confirm not in ['yes', 'y']:
        print("\n❌ Operation cancelled. Please restart to enter new preferences.")
        sys.exit(0)
    
    return {
        'capital_amount': amount,
        'risk_percentage': risk_pct,
        'risk_tolerance': risk_category,
        'expected_returns': expected_returns,
        'investment_horizon': f"{duration} years",
        'duration_years': duration,
        'asset_preferences': preferences,
        'current_date': datetime.now().strftime("%Y-%m-%d")
    }
def build_dynamic_crew(inputs: dict) -> Invex:
    """
    Dynamically build crew based on user asset preferences
    """
    preferences = inputs['asset_preferences']
    
    print("\n" + "="*80)
    print("🤖 ACTIVATING AI AGENTS")
    print("="*80 + "\n")
    
    # Create crew instance
    crew_instance = Invex()
    
    # CRITICAL: Set preferences BEFORE calling crew()
    crew_instance.user_preferences = preferences
    
    print("🎯 Your Selected Asset Classes:")
    if preferences['stocks']:
        print("   ✅ Stocks")
    else:
        print("   ❌ Stocks (excluded)")
    
    if preferences['mutual_funds']:
        print("   ✅ Mutual Funds")
    else:
        print("   ❌ Mutual Funds (excluded)")
    
    if preferences['gold']:
        print("   ✅ Gold")
    else:
        print("   ❌ Gold (excluded)")
    
    if preferences['crypto']:
        print("   ✅ Cryptocurrency")
    else:
        print("   ❌ Cryptocurrency (excluded)")
    
    return crew_instance

def validate_output_quality(output_text: str) -> dict:
    """
    Validate that output contains minimum 10 reasons per investment
    """
    validation = {
        'passed': True,
        'warnings': [],
        'reason_counts': {}
    }
    
    # Count numbered reasons (looking for patterns like "1.", "2.", etc.)
    reason_pattern = r'\d+\.\s+\*\*'
    reason_matches = re.findall(reason_pattern, output_text)
    
    # Check if we have at least some reasoning structure
    if len(reason_matches) < 10:
        validation['passed'] = False
        validation['warnings'].append(
            f"⚠️  Found only {len(reason_matches)} numbered reasons. Expected minimum 10 per investment."
        )
    
    # Check for key sections
    required_sections = ['Investment Rationale', 'Why This', 'Reason', 'Compelling']
    for section in required_sections:
        if section.lower() not in output_text.lower():
            validation['warnings'].append(f"⚠️  Missing expected section: '{section}'")
    
    return validation

def run():
    """
    Run the Invex crew with dynamic user inputs
    """
    # Get user inputs interactively
    inputs = get_user_inputs()
    
    # Build dynamic crew based on preferences
    crew_instance = build_dynamic_crew(inputs)
    
    print("\n🔄 Starting multi-agent investment analysis...\n")
    print("="*80 + "\n")
    
    try:
        # Execute the crew with user inputs
        result = crew_instance.crew().kickoff(inputs=inputs)
        
        # Convert result to string
        result_text = str(result)
        
        # Validate output quality
        print("\n" + "="*80)
        print("✅ Validating output quality...")
        validation = validate_output_quality(result_text)
        
        if validation['warnings']:
            print("\n⚠️  Output Quality Warnings:")
            for warning in validation['warnings']:
                print(f"   {warning}")
            print("\n💡 Note: The report may benefit from regeneration for more detailed rationale.")
        else:
            print("✅ Output quality validation passed!")
        
        # Save output
        output_dir = "outputs"
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = f"{output_dir}/invex_report_{timestamp}.md"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            # Add metadata header
            f.write(f"# Investment Report\n\n")
            f.write(f"**Generated:** {inputs['current_date']}\n")
            f.write(f"**Capital:** ₹{inputs['capital_amount']:,.0f}\n")
            f.write(f"**Risk:** {inputs['risk_percentage']}% ({inputs['risk_tolerance']})\n")
            f.write(f"**Expected Returns:** {inputs['expected_returns']}% annually\n")
            f.write(f"**Horizon:** {inputs['investment_horizon']}\n")
            f.write(f"**Asset Classes:** ")
            selected = [k.replace('_', ' ').title() for k, v in inputs['asset_preferences'].items() if v]
            f.write(", ".join(selected) + "\n\n")
            f.write("---\n\n")
            f.write(result_text)
        
        print(f"\n{'='*80}")
        print(f"✅ Investment report generated successfully!")
        print(f"📄 Report saved to: {output_file}")
        print(f"📏 Report size: {len(result_text):,} characters")
        print(f"{'='*80}\n")
        
        # Display report preview
        print("📋 Report Preview (first 2000 characters):")
        print(f"{'='*80}")
        print(result_text[:2000] + "..." if len(result_text) > 2000 else result_text)
        print(f"{'='*80}\n")
        
        # User feedback prompt
        print("💭 Feedback Request:")
        print("   Does this recommendation give you confidence to invest?")
        print("   Please review the full report and assess:")
        print("   - Clarity of reasoning (10+ reasons per investment)")
        print("   - Trustworthiness of data and sources")
        print("   - Actionability of recommendations")
        print(f"\n📖 Full report available at: {output_file}\n")
        
        # Display expected vs actual returns comparison
        print("="*80)
        print("📊 EXPECTED RETURNS ANALYSIS")
        print("="*80)
        print(f"\nYour Expected Returns: {inputs['expected_returns']}% annually")
        print(f"Over {inputs['duration_years']} years: ₹{inputs['capital_amount']:,.0f} → ₹{inputs['capital_amount'] * ((1 + inputs['expected_returns']/100) ** inputs['duration_years']):,.0f}")
        print("\n💡 Check the report to see if the portfolio allocation can meet these expectations.")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise Exception(f"An error occurred while running the crew: {e}")

def train():
    """
    Train the crew for a given number of iterations.
    """
    inputs = get_user_inputs()
    try:
        crew_instance = build_dynamic_crew(inputs)
        crew_instance.crew().train(n_iterations=int(sys.argv[1]), filename=sys.argv[2], inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while training the crew: {e}")

def replay():
    """
    Replay the crew execution from a specific task.
    """
    try:
        Invex().crew().replay(task_id=sys.argv[1])
    except Exception as e:
        raise Exception(f"An error occurred while replaying the crew: {e}")

def test():
    """
    Test the crew execution and return the results.
    """
    inputs = get_user_inputs()
    try:
        crew_instance = build_dynamic_crew(inputs)
        crew_instance.crew().test(n_iterations=int(sys.argv[1]), openai_model_name=sys.argv[2], inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while testing the crew: {e}")

if __name__ == "__main__":
    run()
