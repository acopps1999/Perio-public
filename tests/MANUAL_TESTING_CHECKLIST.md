# Manual Testing Checklist

Test the hybrid RAG system with these queries and verify results.

## ✅ Structured Queries (Should be <500ms)

### Product → Procedure
- [ ] "What is PerioChip used for?"
  - Expected: List of procedures/conditions
  - Should include clinical evidence
  - Fast response (<300ms)

- [ ] "What conditions does Arestin treat?"
  - Expected: Specific conditions
  - Include phase information

### Procedure → Product
- [ ] "What products for gingivitis?"
  - Expected: List of all products
  - Grouped by phase if available
  - Include pitch points

- [ ] "Show me products for periodontal surgery"
  - Expected: Comprehensive product list
  - Include patient type info

### Product Details
- [ ] "Clinical evidence for PerioChip"
  - Expected: Detailed clinical evidence
  - Should be comprehensive

- [ ] "Pitch points for Arestin"
  - Expected: Formatted bullet list
  - Sales-focused content

### Comparisons
- [ ] "Compare PerioChip and Arestin"
  - Expected: Side-by-side comparison
  - Highlight differences
  - Include clinical evidence

## ✅ Semantic Queries (Should be <1000ms)

### Fuzzy Matches
- [ ] "Products for gum disease"
  - Expected: Find gingivitis, periodontitis products
  - Should use semantic understanding

- [ ] "Best treatment for oral bacteria"
  - Expected: Antimicrobial products
  - Relevance-ranked results

### Exploratory
- [ ] "Tell me about chlorhexidine"
  - Expected: Products containing it
  - Related research if available

- [ ] "What helps with inflammation?"
  - Expected: Anti-inflammatory products
  - Multiple conditions

## ✅ Edge Cases

### No Results
- [ ] "Products for unicorn disease"
  - Expected: Polite "no results" message
  - Suggest rephrasing

### Ambiguous
- [ ] "Tell me about chip"
  - Expected: Find PerioChip
  - Fuzzy matching works

### Complex
- [ ] "What products for Type 3 patients with gingivitis in acute phase?"
  - Expected: Filtered results
  - All constraints applied

## Performance Targets

- Structured queries: <500ms (target: <300ms)
- Semantic queries: <1000ms (target: <800ms)
- Overall: 90%+ queries under 1000ms

## Success Criteria

- [ ] All structured queries return correct results
- [ ] All semantic queries return relevant results
- [ ] Performance targets met for 90%+ of queries
- [ ] No crashes or errors
- [ ] Responses are natural and helpful
