import { useState } from 'react';
import { BookOpen, Brain, Timer, Layers, ChevronDown, ChevronUp, Lightbulb, Star } from 'lucide-react';

interface Strategy {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  summary: string;
  description: string;
  steps: string[];
  tips: string[];
}

const strategies: Strategy[] = [
  {
    id: 'pomodoro',
    title: 'Pomodoro Technique',
    category: 'Time Management',
    icon: Timer,
    color: 'bg-red-50 text-red-600 border-red-200',
    summary: 'Work in focused 25-minute intervals with short breaks to maximize productivity.',
    description:
      'The Pomodoro Technique was developed by Francesco Cirillo in the late 1980s. It uses a timer to break work into intervals, traditionally 25 minutes in length, separated by short breaks. Each interval is called a "pomodoro."',
    steps: [
      'Choose a task you want to work on',
      'Set the timer to 25 minutes',
      'Work on the task until the timer rings',
      'Take a 5-minute short break',
      'After 4 pomodoros, take a longer 15–30 minute break',
    ],
    tips: [
      'Eliminate all distractions before starting',
      'If a thought pops up, write it down and return to it later',
      'Use the break to physically move around',
      "Don't skip the breaks — they are essential for mental recovery",
    ],
  },
  {
    id: 'active-recall',
    title: 'Active Recall',
    category: 'Memory & Retention',
    icon: Brain,
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    summary: 'Test yourself on material rather than passively re-reading to strengthen memory.',
    description:
      'Active recall is the practice of actively stimulating memory during learning. Instead of passively reviewing notes, you close your materials and try to retrieve information from memory. This has been shown to be one of the most effective study techniques.',
    steps: [
      'Study a topic for a set amount of time',
      'Close your notes and look away',
      'Write down or say aloud everything you remember',
      'Check your notes for what you missed',
      'Focus your next study session on the gaps',
    ],
    tips: [
      'Use flashcards (physical or apps like Anki)',
      'Practice answering potential exam questions',
      'Teach the material to someone else',
      'Create summary sheets from memory first',
    ],
  },
  {
    id: 'spaced-repetition',
    title: 'Spaced Repetition',
    category: 'Memory & Retention',
    icon: Star,
    color: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    summary: 'Review information at increasing intervals to move it into long-term memory.',
    description:
      'Spaced repetition exploits the psychological "spacing effect" — the phenomenon whereby learning is greater when studying is spread out over time. By reviewing material just as you are about to forget it, you reinforce the memory and need less time to review it next time.',
    steps: [
      'Study new material thoroughly',
      'Review after 1 day',
      'Review again after 3 days',
      'Review again after 1 week',
      'Continue extending intervals (2 weeks, 1 month, etc.)',
    ],
    tips: [
      'Use spaced repetition apps like Anki to automate scheduling',
      'Combine with active recall for maximum effectiveness',
      'Be consistent — missing reviews breaks the spacing effect',
      'Start spacing early, not just before exams',
    ],
  },
  {
    id: 'task-batching',
    title: 'Task Batching',
    category: 'Productivity',
    icon: Layers,
    color: 'bg-green-50 text-green-600 border-green-200',
    summary: 'Group similar tasks together to minimize context switching and cognitive overhead.',
    description:
      'Task batching is a productivity strategy that involves grouping similar tasks together and completing them in dedicated blocks of time. This reduces the mental cost of switching between different types of work, allowing you to complete more in less time.',
    steps: [
      'Identify all your recurring tasks',
      'Group them into categories (e.g., emails, reading, writing, studying)',
      'Schedule dedicated time blocks for each category',
      'Complete all tasks in a batch before moving to the next',
      'Review and adjust your batches weekly',
    ],
    tips: [
      'Batch your lowest-energy tasks for low-energy time slots',
      'Start with your most important batch',
      'Keep similar tools open for the whole batch',
      'Combine batching with the Pomodoro technique',
    ],
  },
  {
    id: 'cornell-notes',
    title: 'Cornell Note-Taking',
    category: 'Note-Taking',
    icon: BookOpen,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    summary: 'Structure your notes in a proven format to improve comprehension and recall.',
    description:
      'The Cornell Note-Taking System divides each page into three sections: a narrow left column for cues/questions, a wide right column for notes, and a summary section at the bottom. This format encourages active engagement and makes reviewing easier.',
    steps: [
      'Divide your page: 2.5" cue column on the left, 6" notes column on the right, and 2" summary at the bottom',
      'During the lecture/reading, record notes in the right column',
      'After class, write key questions or cues in the left column',
      'Cover the notes column and use cues to quiz yourself',
      'Write a brief summary at the bottom of the page',
    ],
    tips: [
      'Use abbreviations and symbols to write faster',
      'Leave space to add information later',
      'Review your notes within 24 hours of taking them',
      'Use the summary to prepare for exams',
    ],
  },
  {
    id: 'feynman',
    title: 'Feynman Technique',
    category: 'Deep Understanding',
    icon: Lightbulb,
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    summary: 'Explain concepts in simple terms to identify and fill gaps in your understanding.',
    description:
      'Named after Nobel Prize-winning physicist Richard Feynman, this technique involves explaining a concept as if teaching it to a child. When you cannot explain something simply, it reveals gaps in your understanding that you need to address.',
    steps: [
      'Choose a concept you want to understand',
      'Explain it in simple terms as if teaching a 12-year-old',
      'Identify where you struggle or use jargon',
      'Go back to the source material to fill those gaps',
      'Simplify further and use analogies',
    ],
    tips: [
      'Write out the explanation on paper',
      "Use simple language — avoid jargon you can't explain",
      'Create analogies to everyday concepts',
      'Teach it to someone — or even an imaginary student',
    ],
  },
];

const CATEGORIES = [...new Set(strategies.map((s) => s.category))];

export function Strategies() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = activeCategory
    ? strategies.filter((s) => s.category === activeCategory)
    : strategies;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Study Strategies</h1>
        <p className="text-slate-500">Evidence-based techniques to maximize your learning and productivity</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            !activeCategory
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Strategy Cards */}
      <div className="space-y-4">
        {filtered.map((strategy) => {
          const Icon = strategy.icon;
          const isExpanded = expandedId === strategy.id;

          return (
            <div key={strategy.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : strategy.id)}
                className="w-full text-left p-5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border ${strategy.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-slate-900">{strategy.title}</h3>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {strategy.category}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{strategy.summary}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 p-5 space-y-5">
                  <p className="text-sm text-slate-600 leading-relaxed">{strategy.description}</p>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                      How to Apply
                    </h4>
                    <ol className="space-y-1.5">
                      {strategy.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="w-5 h-5 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Pro Tips
                    </h4>
                    <ul className="space-y-1.5">
                      {strategy.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="text-yellow-400 mt-0.5">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
