import { Prisma, PrismaClient, ProblemDifficulty, ProblemStatus } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

type SeedTest = { name: string; input: string; expectedOutput: string; hidden: boolean };

type SeedProblem = {
  slug: string;
  title: string;
  statement: string;
  difficulty: ProblemDifficulty;
  track: string;
  language: string;
  starterCode: string;
  tests: SeedTest[];
};

/**
 * Every problem follows the platform's judging model: the program reads stdin
 * and prints to stdout. Each carries at least one hidden case so a learner
 * cannot pass by special-casing the worked examples.
 */
const PROBLEMS: SeedProblem[] = [
  {
    slug: "sum-two-integers",
    title: "Sum Two Integers",
    statement: "Read two space-separated integers from standard input and print their sum.",
    difficulty: ProblemDifficulty.EASY,
    track: "python",
    language: "python",
    starterCode: "import sys\n\na, b = map(int, sys.stdin.readline().split())\n# TODO: print their sum\nprint(0)\n",
    tests: [
      { name: "adds positives", input: "2 3", expectedOutput: "5", hidden: false },
      { name: "adds negatives", input: "-4 -6", expectedOutput: "-10", hidden: false },
      { name: "handles large values", input: "1000000 1", expectedOutput: "1000001", hidden: true }
    ]
  },
  {
    slug: "reverse-a-string",
    title: "Reverse a String",
    statement: "Read one line from standard input and print it reversed.",
    difficulty: ProblemDifficulty.EASY,
    track: "javascript",
    language: "javascript",
    starterCode: "const s = require('fs').readFileSync(0, 'utf8').trim();\n// TODO: print the reversed string\nconsole.log(s);\n",
    tests: [
      { name: "reverses abc", input: "abc", expectedOutput: "cba", hidden: false },
      { name: "handles a single character", input: "z", expectedOutput: "z", hidden: false },
      { name: "reverses a longer word", input: "codeforge", expectedOutput: "egrofedoc", hidden: true }
    ]
  },
  {
    slug: "count-vowels",
    title: "Count Vowels",
    statement: "Read one lowercase line and print how many of its characters are vowels (a, e, i, o, u).",
    difficulty: ProblemDifficulty.EASY,
    track: "python",
    language: "python",
    starterCode: "import sys\n\nline = sys.stdin.readline().strip()\n# TODO: count the vowels\nprint(0)\n",
    tests: [
      { name: "counts in a word", input: "education", expectedOutput: "5", hidden: false },
      { name: "handles no vowels", input: "rhythm", expectedOutput: "0", hidden: false },
      { name: "counts a longer line", input: "the quick brown fox", expectedOutput: "5", hidden: true }
    ]
  },
  {
    slug: "fizzbuzz-range",
    title: "FizzBuzz Range",
    statement:
      "Read an integer n and print the numbers 1 to n, one per line, replacing multiples of 3 with Fizz, multiples of 5 with Buzz, and multiples of both with FizzBuzz.",
    difficulty: ProblemDifficulty.MEDIUM,
    track: "python",
    language: "python",
    starterCode: "import sys\n\nn = int(sys.stdin.readline())\n# TODO: print the sequence\n",
    tests: [
      { name: "first five", input: "5", expectedOutput: "1\n2\nFizz\n4\nBuzz", hidden: false },
      { name: "reaches FizzBuzz", input: "15", expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", hidden: false },
      { name: "handles n = 1", input: "1", expectedOutput: "1", hidden: true }
    ]
  },
  {
    slug: "second-largest",
    title: "Second Largest",
    statement:
      "Read a line of space-separated integers and print the second largest distinct value. The input always contains at least two distinct values.",
    difficulty: ProblemDifficulty.MEDIUM,
    track: "javascript",
    language: "javascript",
    starterCode:
      "const nums = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\n// TODO: print the second largest distinct value\nconsole.log(0);\n",
    tests: [
      { name: "distinct values", input: "3 1 4 1 5", expectedOutput: "4", hidden: false },
      { name: "ignores duplicates of the max", input: "7 7 2", expectedOutput: "2", hidden: false },
      { name: "handles negatives", input: "-1 -5 -3", expectedOutput: "-3", hidden: true }
    ]
  },
  {
    slug: "balanced-brackets",
    title: "Balanced Brackets",
    statement:
      "Read one line containing only the characters ()[]{} and print YES if every bracket is correctly closed in order, otherwise NO.",
    difficulty: ProblemDifficulty.HARD,
    track: "python",
    language: "python",
    starterCode: "import sys\n\nline = sys.stdin.readline().strip()\n# TODO: print YES or NO\nprint(\"NO\")\n",
    tests: [
      { name: "simple pair", input: "()", expectedOutput: "YES", hidden: false },
      { name: "nested and mixed", input: "{[()]}", expectedOutput: "YES", hidden: false },
      { name: "wrong order", input: "([)]", expectedOutput: "NO", hidden: true },
      { name: "unclosed", input: "(((", expectedOutput: "NO", hidden: true }
    ]
  },
  {
    slug: "word-frequency",
    title: "Most Frequent Word",
    statement:
      "Read one line of space-separated lowercase words and print the word that appears most often. If several tie, print the one that comes first alphabetically.",
    difficulty: ProblemDifficulty.HARD,
    track: "python",
    language: "python",
    starterCode: "import sys\n\nwords = sys.stdin.readline().split()\n# TODO: print the most frequent word\nprint(\"\")\n",
    tests: [
      { name: "clear winner", input: "a b a c a", expectedOutput: "a", hidden: false },
      { name: "alphabetical tie-break", input: "pear apple pear apple", expectedOutput: "apple", hidden: false },
      { name: "single word", input: "solo", expectedOutput: "solo", hidden: true }
    ]
  },
  {
    slug: "print-shell-args",
    title: "Sum Lines",
    statement: "Read every line of standard input, each holding one integer, and print their total.",
    difficulty: ProblemDifficulty.EASY,
    track: "devops",
    language: "bash",
    starterCode: "# TODO: read every line and print the total\necho 0\n",
    tests: [
      { name: "adds three lines", input: "1\n2\n3\n", expectedOutput: "6", hidden: false },
      { name: "handles a single line", input: "42\n", expectedOutput: "42", hidden: false },
      { name: "handles negatives", input: "10\n-4\n", expectedOutput: "6", hidden: true }
    ]
  }
];

async function main() {
  for (const problem of PROBLEMS) {
    const sampleTests = problem.tests
      .filter((test) => !test.hidden)
      .map(({ name, input, expectedOutput }) => ({ name, input, expectedOutput }));

    const fields = {
      title: problem.title,
      statement: problem.statement,
      difficulty: problem.difficulty,
      track: problem.track,
      language: problem.language,
      starterCode: problem.starterCode,
      sampleTests: sampleTests as Prisma.InputJsonValue,
      tests: problem.tests as unknown as Prisma.InputJsonValue,
      status: ProblemStatus.PUBLISHED
    };

    await prisma.problem.upsert({
      where: { slug: problem.slug },
      create: { slug: problem.slug, ...fields },
      update: fields
    });
  }

  const total = await prisma.problem.count({ where: { status: ProblemStatus.PUBLISHED } });
  console.log(`Seed problems complete. Published problems: ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
