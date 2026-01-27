#!/bin/bash
# FORENSIC TROUBLESHOOTING (MODULE 14)
# ====================================
# "When in doubt, check the ledger."

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="forensic_report_${TIMESTAMP}.md"

echo "# 🕵️‍♂️ FORENSIC TROUBLESHOOTING REPORT" > $REPORT_FILE
echo "**Date:** $(date)" >> $REPORT_FILE
echo "**Executor:** $USER" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "## 1. 🌡️ SYSTEM VITALS" >> $REPORT_FILE
echo "\`\`\`" >> $REPORT_FILE
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" >> $REPORT_FILE
echo "\`\`\`" >> $REPORT_FILE

echo "## 2. 🧟 ZOMBIE PROCESS SCAN" >> $REPORT_FILE
echo "\`\`\`" >> $REPORT_FILE
ps aux | grep "defunct" >> $REPORT_FILE
echo "\`\`\`" >> $REPORT_FILE

echo "## 3. 🕸️ NETWORK CONNECTIVITY" >> $REPORT_FILE
echo "\`\`\`" >> $REPORT_FILE
curl -v http://localhost:8000/health 2>&1 | head -n 10 >> $REPORT_FILE
echo "\`\`\`" >> $REPORT_FILE

echo "## 4. 📜 LOG TAIL (LAST 50 LINES)" >> $REPORT_FILE
echo "### Zimmer-03 (Agent Zero)" >> $REPORT_FILE
echo "\`\`\`" >> $REPORT_FILE
docker logs --tail 50 Zimmer-03-AgentZero-ChefCoder >> $REPORT_FILE 2>&1
echo "\`\`\`" >> $REPORT_FILE

echo "### Zimmer-05 (Steel)" >> $REPORT_FILE
echo "\`\`\`" >> $REPORT_FILE
docker logs --tail 50 Zimmer-05-Steel-Tarnkappe >> $REPORT_FILE 2>&1
echo "\`\`\`" >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "✅ Forensic Snapshot Saved: $REPORT_FILE"
