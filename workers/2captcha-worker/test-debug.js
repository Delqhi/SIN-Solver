const { ConsensusEngine } = require('./dist/consensus');

const engine = new ConsensusEngine({
  error(msg, context) { console.log('ERROR:', msg, context); },
  warn(msg, context) { console.log('WARN:', msg, context); },
  info(msg, context) { console.log('INFO:', msg, context); },
  debug(msg, context) { console.log('DEBUG:', msg, context); },
});

const results = [
  {
    agentId: 'agent-A',
    answer: 'ABC123',
    confidence: 0.98,
    solveTime: 150,
    method: 'yolo',
    timestamp: new Date(),
  },
  {
    agentId: 'agent-B',
    answer: 'ABC123',
    confidence: 0.94,
    solveTime: 180,
    method: 'ddddocr',
    timestamp: new Date(),
  },
  {
    agentId: 'agent-C',
    answer: 'ABC123',
    confidence: 0.97,
    solveTime: 200,
    method: 'whisper',
    timestamp: new Date(),
  },
];

const decision = engine.compareAnswers(results);
console.log('\nDECISION:', {
  action: decision.action,
  reason: decision.reason,
  answer: decision.answer,
  votingPattern: decision.votingPattern,
});
