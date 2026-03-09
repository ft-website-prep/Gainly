#!/bin/bash
# ==========================================
# GAINLY COLOR MIGRATION SCRIPT
# Sky-Blue/Emerald → Red (#e10600)
# ==========================================
# Usage: Run from project root (where src/ is)
#   chmod +x color-migrate.sh
#   ./color-migrate.sh
# ==========================================

echo "🎨 Gainly Color Migration: Sky-Blue → Red"
echo "=========================================="
echo ""

# Safety check
if [ ! -d "src" ]; then
  echo "❌ Error: src/ directory not found. Run this from project root."
  exit 1
fi

# Count files that will be affected
COUNT=$(grep -rl "sky-\|emerald-\|from-sky\|to-blue" src/ --include="*.jsx" --include="*.js" | wc -l | tr -d ' ')
echo "📁 Found $COUNT files with sky/emerald references"
echo ""

# ==========================================
# GRADIENTS (Logo, CTA boxes, etc.)
# ==========================================
echo "1/8 Replacing gradients..."

# Logo gradient: sky-400/blue-500 → red-500/red-600
find src/ -name "*.jsx" -exec sed -i '' 's/from-sky-400 to-blue-500/from-red-500 to-red-600/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/from-sky-500 to-blue-500/from-red-500 to-red-600/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/from-sky-500 to-blue-600/from-red-500 to-red-700/g' {} +

# Landing page emerald gradients
find src/ -name "*.jsx" -exec sed -i '' 's/from-emerald-400 to-emerald-600/from-red-500 to-red-600/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/from-emerald-400/from-red-400/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/to-emerald-600/to-red-600/g' {} +

# ==========================================
# SOLID BACKGROUNDS
# ==========================================
echo "2/8 Replacing backgrounds..."

find src/ -name "*.jsx" -exec sed -i '' 's/bg-sky-500/bg-red-500/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/bg-sky-400/bg-red-400/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/bg-sky-100/bg-red-100/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/bg-sky-50/bg-red-50/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/bg-emerald-500/bg-red-500/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/bg-emerald-400/bg-red-400/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/bg-emerald-500\/20/bg-red-500\/20/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/bg-emerald-400\/60/bg-red-400\/60/g' {} +

# ==========================================
# TEXT COLORS
# ==========================================
echo "3/8 Replacing text colors..."

find src/ -name "*.jsx" -exec sed -i '' 's/text-sky-600/text-red-600/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/text-sky-500/text-red-500/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/text-sky-400/text-red-400/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/text-sky-100/text-red-100/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/text-emerald-400/text-red-400/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/text-emerald-100/text-red-100/g' {} +

# ==========================================
# HOVER STATES
# ==========================================
echo "4/8 Replacing hover states..."

find src/ -name "*.jsx" -exec sed -i '' 's/hover:bg-sky-600/hover:bg-red-600/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/hover:bg-sky-500/hover:bg-red-500/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/hover:bg-sky-100/hover:bg-red-100/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/hover:bg-sky-50/hover:bg-red-50/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/hover:text-sky-600/hover:text-red-600/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/hover:text-sky-500/hover:text-red-500/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/hover:bg-emerald-400/hover:bg-red-400/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/hover:bg-emerald-500/hover:bg-red-500/g' {} +

# Also for hover:bg-sky-50/30 patterns
find src/ -name "*.jsx" -exec sed -i '' 's/hover:bg-sky-50\/30/hover:bg-red-50\/30/g' {} +

# ==========================================
# BORDERS
# ==========================================
echo "5/8 Replacing borders..."

find src/ -name "*.jsx" -exec sed -i '' 's/border-sky-400/border-red-400/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/border-sky-300/border-red-300/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/border-sky-200/border-red-200/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/focus:border-sky-400/focus:border-red-400/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/hover:border-sky-200/hover:border-red-200/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/hover:border-sky-300/hover:border-red-300/g' {} +

# ==========================================
# SHADOWS
# ==========================================
echo "6/8 Replacing shadows..."

find src/ -name "*.jsx" -exec sed -i '' 's/shadow-sky-200/shadow-red-200/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/shadow-sky-100/shadow-red-100/g' {} +

# ==========================================
# RINGS
# ==========================================
echo "7/8 Replacing rings..."

find src/ -name "*.jsx" -exec sed -i '' 's/ring-sky-100/ring-red-100/g' {} +
find src/ -name "*.jsx" -exec sed -i '' 's/ring-sky-200/ring-red-200/g' {} +

# ==========================================
# SVG / INLINE COLORS (SkillTrees etc.)
# ==========================================
echo "8/8 Replacing inline colors..."

# SVG stroke/fill colors used in SkillTrees
find src/ -name "*.jsx" -exec sed -i '' "s/stroke={color} strokeWidth/stroke={color} strokeWidth/g" {} +
find src/ -name "*.jsx" -exec sed -i '' "s/'#38bdf8'/'#e10600'/g" {} +
find src/ -name "*.jsx" -exec sed -i '' 's/#38bdf8/#e10600/g' {} +
find src/ -name "*.jsx" -exec sed -i '' "s/color = '#38bdf8'/color = '#e10600'/g" {} +

# Hover stroke in SVG
find src/ -name "*.jsx" -exec sed -i '' 's/hover:stroke-sky-400/hover:stroke-red-400/g' {} +

# ==========================================
# ALSO PROCESS .js FILES (content.js etc.)
# ==========================================
find src/ -name "*.js" -exec sed -i '' 's/#38bdf8/#e10600/g' {} +

# ==========================================
# VERIFICATION
# ==========================================
echo ""
echo "✅ Migration complete!"
echo ""

# Check for any remaining sky/emerald references
REMAINING=$(grep -r "sky-\|emerald-" src/ --include="*.jsx" --include="*.js" -l 2>/dev/null | wc -l | tr -d ' ')
if [ "$REMAINING" -gt 0 ]; then
  echo "⚠️  $REMAINING files still have sky/emerald references:"
  grep -r "sky-\|emerald-" src/ --include="*.jsx" --include="*.js" -l
  echo ""
  echo "These might be intentional (e.g. difficulty badges use green/amber/red)"
  echo "or need manual review."
else
  echo "🎉 No remaining sky/emerald references found!"
fi

echo ""
echo "Next steps:"
echo "  1. Check tailwind.config.js has the new red colors"
echo "  2. Run: npm run dev"
echo "  3. Review the app visually"
echo "  4. Git commit: git add . && git commit -m 'feat: color scheme red'"