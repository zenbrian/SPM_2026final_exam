import re
import json
import os

def parse_txt(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Split into sections based on Q1, Q2, etc.
    # Pattern to match: ### **Q1** or similar
    sections = re.split(r'###\s+\*\*Q\d+\*\*', content)
    
    questions = []
    question_id = 1
    
    # The first split element is metadata before Q1, skip it
    for sec in sections[1:]:
        sec = sec.strip()
        if not sec:
            continue
            
        # Parse Question (題目)
        # Matches '* **題目：** ' followed by any text up to the next '*'
        question_match = re.search(r'\*\s+\*\*題目：\*\*\s*(.*?)(?=\n\s*\*\s+\*\*|\n\s*\n|\Z)', sec, re.DOTALL)
        if not question_match:
            continue
        question_text = question_match.group(1).strip()
        
        # Parse Options (選項)
        # Find the options block starting with '* **選項：**'
        options = {}
        # We search for A, B, C, D lines in the block
        # Example format: 
        # * **選項：** * A. Complex
        # * B. Chaotic
        # * C. Clear
        # * D. Complicated
        opt_pattern = r'\*\s+([A-D])\.\s*(.*?)(?=\n\s*\*|\n\s*\n|\Z)'
        opt_matches = re.findall(opt_pattern, sec)
        for opt_let, opt_val in opt_matches:
            options[opt_let] = opt_val.strip()
            
        # Parse Answer (解答)
        # Matches '* **解答：** ' followed by correct option letter
        ans_match = re.search(r'\*\s+\*\*解答：\*\*\s*([A-D])', sec)
        answer_letter = ans_match.group(1) if ans_match else ""
        
        # Add pre-defined detailed explanations
        explanation = get_explanation(question_id, question_text)
        
        questions.append({
            "id": question_id,
            "question": question_text,
            "options": options,
            "answer": answer_letter,
            "explanation": explanation
        })
        question_id += 1
        
    return questions

def get_explanation(qid, question_text):
    # Mapping qid to the corresponding detailed explanation
    explanations = {
        1: "在 Cynefin 框架中，**Clear（清晰/簡單）** 領域的特徵是因果關係非常明確且人人皆知。此領域的處理方法是「感知-分類-響應」（Sense - Categorize - Respond），並直接套用已知的**最佳實踐（Best Practices）**。",
        2: "面對全新的市場與不可預測的客戶反應，這屬於 Cynefin 框架中的 **Complex（複雜）** 領域。在複雜領域中，因果關係只能在事後理解，因此必須透過**實驗並從結果中學習**（Probe - Sense - Respond）來找出規律。",
        3: "自然災害時的危機處理屬於 Cynefin 框架中的 **Chaotic（混亂）** 領域。在混亂領域中沒有明確的因果關係，首要任務是**立刻採取行動以建立秩序**（Act - Sense - Respond），然後再行感知並響應。",
        4: "在 Cynefin 框架中，**Complex（複雜）** 領域需要透過**安全失敗的嘗試/實驗（Safe-to-fail experiments）**來引導並識別出浮現的模式（Emerging Patterns）。",
        5: "將僵化的最佳實踐（通常適用於 Clear 領域）應用到高度不確定且創新的問題上，會因為**誤判情境（Misdiagnosis of the context）**而導致錯誤的決策與糟糕的結果。",
        6: "**預測型（Predictive/Waterfall）** 生命週期的核心假設是專案需求明確，且各階段（如需求、設計、開發、測試）必須**順序執行**，前一階段完成後才能開始下一階段，重疊極少。",
        7: "**敏捷（Agile）** 生命週期結合了**迭代型（透過頻繁回饋來改進產品）**與**增量型（儘早且持續交付可運作的產出）**的優勢，能快速適應變化並提供商業價值。",
        8: "當專案需求固定、範疇明確且合規性要求嚴格的詳細前期規劃時，**預測型**是最合適的；而**敏捷型**因為強調彈性與變更，反而最不適用，可能會帶來多餘的開銷或合規風險。",
        9: "雷達圖顯示團隊文化與能力適合敏捷，但專案本身的變更率（Change Rate）低且無法進行增量交付。這代表專案需求非常穩定且必須一次性交付，因此**敏捷開發在此專案限制下所帶來的效益非常有限**。",
        10: "敏捷開發最適合應對高度不確定性與頻繁的需求變更（如專案 A），使其能發揮極大的適應力。而專案 B 需求穩定且合規性高，更適合使用預測型生命週期。因此**專案 A 比專案 B 更適合採用敏捷方法**。"
    }
    return explanations.get(qid, "無詳細解析")

if __name__ == "__main__":
    txt_path = "選擇題 (1).txt"
    if not os.path.exists(txt_path):
        print(f"Error: {txt_path} not found.")
    else:
        parsed_questions = parse_txt(txt_path)
        
        # 1. Output questions.json
        output_path = "questions.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(parsed_questions, f, ensure_ascii=False, indent=2)
        print(f"Successfully converted {len(parsed_questions)} questions to {output_path}")
        
        # 2. Output questions.js to bypass file:// CORS policy
        js_path = "questions.js"
        with open(js_path, "w", encoding="utf-8") as f:
            f.write("const questionBankData = ")
            json.dump(parsed_questions, f, ensure_ascii=False, indent=2)
            f.write(";\n")
        print(f"Successfully generated {js_path}")
