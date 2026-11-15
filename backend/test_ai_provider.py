from ai_provider import generate_with_fallback

prompt = """
Generate one beginner-level Python multiple-choice question.
Include:
- Question
- Four options
- Correct answer
- Short explanation

Return the result clearly.
"""

result = generate_with_fallback(prompt)

print("\n========== AI TEST RESULT ==========")
print("Success:", result["success"])
print("Provider:", result["provider"])

if result["success"]:
    print("\nGenerated Content:")
    print(result["content"])
else:
    print("\nBoth providers failed:")
    print(result["errors"])