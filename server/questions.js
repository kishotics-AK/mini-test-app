const q = (text, options, correct) => ({ text, options, correct });
module.exports = [
  q('Which HTML tag creates the largest heading?', ['<h6>', '<h1>', '<head>', '<header>'], 1),
  q('What does CSS stand for?', ['Cascading Style Sheets', 'Creative Style System', 'Computer Style Sheets', 'Colorful Style Syntax'], 0),
  q('Which array method adds an element to the end of an array in JavaScript?', ['shift()', 'pop()', 'push()', 'unshift()'], 2),
  q('Which React hook manages state in a function component?', ['useEffect', 'useState', 'useRef', 'useMemo'], 1),
  q('What is the default port of MongoDB?', ['3306', '5432', '8080', '27017'], 3),
  q('Which HTTP status code means "Not Found"?', ['200', '301', '404', '500'], 2),
  q('Which of these is NOT a primitive type in JavaScript?', ['String', 'Number', 'Boolean', 'Object'], 3),
  q('Node.js runs JavaScript using which engine?', ['SpiderMonkey', 'V8', 'Chakra', 'JavaScriptCore'], 1),
  q('Which HTTP method is normally used to create a new resource?', ['GET', 'DELETE', 'POST', 'HEAD'], 2),
  q('In Express, which built-in middleware parses JSON request bodies?', ['express.json()', 'express.static()', 'express.Router()', 'express.query()'], 0),
  q('What does JWT stand for?', ['Java Web Token', 'JSON Web Token', 'JavaScript Web Transfer', 'JSON Write Technique'], 1),
  q('Which command installs the dependencies listed in package.json?', ['npm start', 'npm run build', 'npm install', 'npm init'], 2),
];
