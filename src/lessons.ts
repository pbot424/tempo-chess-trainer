export type Lesson = {
  id: string;
  category: string;
  title: string;
  description: string;
  minutes: number;
  body: string[];
  question: string;
  answers: string[];
  correct: number;
  explanation: string;
};
export const lessons: Lesson[] = [
  {
    id: "pieces",
    category: "Foundations",
    title: "Meet your pieces",
    description: "Six pieces. A world of possibilities.",
    minutes: 4,
    body: [
      "The rook moves any distance along a rank or file. The bishop moves diagonally. The queen combines both. Knights move in an L: two squares in one direction and one sideways, and can jump over pieces.",
      "The king moves one square in any direction, but never into check. Pawns move forward one square (or two from their starting square), capture diagonally, and cannot move backward. White moves first.",
      "Typical material values are pawn 1, knight 3, bishop 3, rook 5, queen 9. These are guides, not guarantees: activity and king safety can matter more.",
    ],
    question: "Which piece can jump over other pieces?",
    answers: ["Bishop", "Knight", "Rook"],
    correct: 1,
    explanation:
      "A knight can jump. Its L-shaped move makes it especially useful in crowded positions.",
  },
  {
    id: "rules",
    category: "Foundations",
    title: "Check, mate & special moves",
    description: "Know the rules that change the game.",
    minutes: 6,
    body: [
      "Check means your king is attacked. You must move the king, block the attack, or capture the attacker. If no legal escape exists, it is checkmate. You never capture the king.",
      "Castling moves the king two squares toward a rook, and that rook to the square the king crossed. Neither piece may have moved; the path must be clear; the king cannot be in check, pass through check, or land in check.",
      "A pawn reaching the last rank promotes to a queen, rook, bishop, or knight. En passant lets a pawn capture an adjacent enemy pawn that just advanced two squares, as if it moved one. This opportunity lasts only for the immediate reply.",
      "Stalemate is a draw: the player to move has no legal move and is not in check. Repetition, insufficient mating material, and the fifty-move rule can also draw a game. Tempo automatically ends games on threefold repetition or fifty moves without a pawn move or capture.",
    ],
    question: "No legal moves, but your king is not in check. What happens?",
    answers: ["You lose", "You win", "Stalemate — a draw"],
    correct: 2,
    explanation:
      "Checkmate requires check. Without check, having no legal move is stalemate.",
  },
  {
    id: "opening",
    category: "Opening",
    title: "Give every piece a purpose",
    description: "Control the center. Develop. Protect your king.",
    minutes: 5,
    body: [
      "Start by influencing the center: d4, e4, d5, and e5. Central control gives your pieces routes to both sides of the board. You can control squares with pieces as well as occupy them with pawns.",
      "Develop knights and bishops to active squares, usually before moving the same piece again. Castle when it makes your king safer and connects your rooks.",
      "Avoid bringing your queen out too early: your opponent can develop while attacking her. Learn the ideas behind an opening before memorizing long move sequences.",
    ],
    question: "What is usually the best opening priority?",
    answers: [
      "Move the queen repeatedly",
      "Develop pieces and control the center",
      "Push every pawn",
    ],
    correct: 1,
    explanation:
      "Development and central control prepare your whole army for the middlegame.",
  },
  {
    id: "tactics",
    category: "Tactics",
    title: "See the move behind the move",
    description: "Forks, pins, skewers & discovered attacks.",
    minutes: 7,
    body: [
      "A fork attacks two targets with one piece. Knights are natural fork-makers, but every piece can fork. Scan for loose pieces and exposed kings.",
      "A pin makes a piece costly or illegal to move because a valuable piece sits behind it. A skewer reverses the order: the valuable piece moves and exposes a target behind.",
      "A discovered attack appears when one piece moves out of another’s line. A double check attacks the king with two pieces at once; the king must move.",
      "Before every move, examine checks, captures, and threats for both players. Calculate your opponent’s best reply instead of assuming they cooperate.",
    ],
    question: "One knight attacks the king and queen at once. This is a…",
    answers: ["Pin", "Fork", "Stalemate"],
    correct: 1,
    explanation:
      "A fork creates two threats. A checking fork often wins material because the king must be saved first.",
  },
  {
    id: "safety",
    category: "Strategy",
    title: "Make your king feel at home",
    description: "Recognize danger before the attack arrives.",
    minutes: 5,
    body: [
      "A safe king usually has friendly pawns nearby, defenders available, and no open lines pointing toward it. Castling is a tool for safety, not an obligation in every position.",
      "Pawn moves around your castled king leave squares behind. Before pushing a pawn, ask which diagonals and files it will open.",
      "Notice back-rank weaknesses: a king trapped behind its own pawns may be vulnerable to a rook or queen. A safe escape square can help, but check for tactics before spending a tempo.",
    ],
    question: "What should you check before moving a pawn near your king?",
    answers: [
      "Which lines and squares it exposes",
      "Only whether it captures material",
      "Whether it looks aggressive",
    ],
    correct: 0,
    explanation:
      "Pawn moves cannot be undone. Newly opened files, diagonals, and weak squares can give an attacker a route in.",
  },
  {
    id: "strategy",
    category: "Strategy",
    title: "Turn a position into a plan",
    description: "Pawn structure, activity & useful trades.",
    minutes: 8,
    body: [
      "Find your least active piece and improve it. Rooks like open files; bishops like open diagonals; knights thrive on protected outposts that enemy pawns cannot chase.",
      "Isolated pawns have no friendly pawn on adjacent files. Doubled pawns share a file. These can be weaknesses, but may bring open lines and activity in return. A passed pawn has no enemy pawn ahead on its own or adjacent files.",
      "Trade when the resulting position helps you. When ahead in material, simplifying pieces often helps; keep enough pawns to win. Opposite-colored bishops or fortress positions can complicate that rule.",
      "Compare king safety, material, pawn structure, space, and piece activity. Choose a plan based on what the position needs, then recheck tactics.",
    ],
    question: "A rook is usually most active on…",
    answers: [
      "A file blocked by its own pawns",
      "An open file",
      "Its original square forever",
    ],
    correct: 1,
    explanation:
      "An open file gives the rook entry points and pressure into the opponent’s position.",
  },
  {
    id: "endgame",
    category: "Endgame",
    title: "Finish what you started",
    description: "Active kings, passed pawns & opposition.",
    minutes: 7,
    body: [
      "With fewer pieces on the board, bring your king into the action. It can attack pawns and support promotion, as long as it avoids checks and tactical threats.",
      "In king-and-pawn endings, opposition often matters: kings face one another with one square between, and the player to move may have to give way. Count pawn races carefully, including whose turn it is.",
      "A passed pawn needs support. Rooks often belong behind passed pawns, either to push your own or stop the opponent’s. Before trading into a pawn ending, calculate whether your king can reach the key squares.",
    ],
    question: "In a quiet pawn endgame, your king should usually…",
    answers: [
      "Stay in the corner",
      "Become an active piece",
      "Avoid all pawns",
    ],
    correct: 1,
    explanation:
      "The king is a fighting piece in the endgame. Use it to escort your pawns and attack enemy pawns.",
  },
  {
    id: "mate",
    category: "Endgame",
    title: "Deliver a confident checkmate",
    description: "Convert queen and rook advantages.",
    minutes: 6,
    body: [
      "With king and queen against a lone king, use your queen to reduce the enemy king’s space. Bring your king close enough to support the final checkmate.",
      "With king and rook, cut the enemy king off along a rank or file, bring your own king up, then shrink the box. Keep your rook far enough away that it cannot be captured.",
      "Always check the opponent’s legal moves before a non-checking move. If you remove their last legal move without giving check, you have stalemated them.",
    ],
    question: "What must you avoid when boxing in a lone king?",
    answers: ["Supporting your queen", "Stalemate", "Giving check"],
    correct: 1,
    explanation:
      "A winning material advantage becomes a draw if the opponent has no legal move and is not in check.",
  },
  {
    id: "thinking",
    category: "Practice",
    title: "Build your thinking routine",
    description: "Calculation, notation & learning from losses.",
    minutes: 5,
    body: [
      "Use a repeatable routine: what did the last move change? Is anything hanging? What are the checks, captures, and threats? Pick candidate moves and calculate the strongest reply to each.",
      "Chess notation names the destination square: Nf3 means a knight goes to f3; B is bishop, R rook, Q queen, K king. Pawn moves omit a letter. x means capture, + check, # checkmate, and O-O kingside castling.",
      "Review a game before starting another. Identify one decision to repeat and one habit to change. In timed chess, reserve thinking time for forcing lines and critical decisions. Tempo games are untimed so you can build that routine first.",
    ],
    question: "The most useful question after choosing a move is…",
    answers: [
      "What is my opponent’s best reply?",
      "Will it surprise my opponent?",
      "Can I move instantly?",
    ],
    correct: 0,
    explanation:
      "Testing your idea against the strongest reply makes your calculation reliable.",
  },
];
