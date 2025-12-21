import lessonData11 from "./data/1-1.json";
import lessonData12 from "./data/1-2.json";
import lessonData21 from "./data/2-1.json";
import lessonData22 from "./data/2-2.json";
import lessonData31 from "./data/3-1.json";
import lessonData32 from "./data/3-2.json";
import lessonData41 from "./data/4-1.json";
import lessonData42 from "./data/4-2.json";
import lessonData51 from "./data/5-1.json";
import lessonData52 from "./data/5-2.json";
import lessonData61 from "./data/6-1.json";
import lessonData62 from "./data/6-2.json";
import lessonData71 from "./data/7-1.json";
import lessonData72 from "./data/7-2.json";
import lessonData81 from "./data/8-1.json";
import lessonData82 from "./data/8-2.json";
import lessonData91 from "./data/9-1.json";
import lessonData92 from "./data/9-2.json";
import lessonData101 from "./data/10-1.json";
import lessonData102 from "./data/10-2.json";
import lessonData111 from "./data/11-1.json";
import lessonData111supp from "./data/11-1-supp.json";
import lessonData112 from "./data/11-2.json";
import lessonData121 from "./data/12-1.json";
import lessonData122 from "./data/12-2.json";
import lessonData131 from "./data/13-1.json";
import lessonData131supp from "./data/13-1-supp.json";
import lessonData131directions from "./data/13-1-directions.json";
import lessonData132 from "./data/13-2.json";
import lessonData141 from "./data/14-1.json";
import lessonData141supp from "./data/14-1-supp.json";
import lessonData142 from "./data/14-2.json";
import lessonData142supp from "./data/14-2-supp.json";
import fables1 from "./data/fables-1.json";
import fables2 from "./data/fables-2.json";
import fables3 from "./data/fables-3.json";
export interface Sentence {
  lesson: string;
  def: string;
  words: {
    character: string;
    pinyin: string;
  }[];
  id: string;
}

export enum CharState {
  green = 0, // correctly written without hints
  yellow = 1, // correctly written with hints
  red = 2, // incorrectly written even with hints
}

type LessonJsonData = {
  sentences: Array<{
    def: string;
    words: Array<{
      character: string;
      pinyin: string;
    }>;
  }>;
};

/**
 * Transforms JSON data from lesson files into the Sentence[] format
 * @param jsonData The raw JSON data from the lesson file
 * @param lessonId The lesson identifier (e.g., "ic lesson 1-1")
 * @returns {Sentence[]} Array of sentences in the required format
 */
function transformLessonData(
  jsonData: LessonJsonData,
  lessonId: string,
): Sentence[] {
  if (!jsonData || !jsonData.sentences || !Array.isArray(jsonData.sentences)) {
    return [];
  }

  return jsonData.sentences.map((sentence) => ({
    lesson: lessonId,
    def: sentence.def,
    words: sentence.words.map((word) => ({
      character: word.character,
      pinyin: word.pinyin,
    })),
    id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
  }));
}

export function getSentences(): Sentence[] {
  return [
    ...transformLessonData(lessonData11, "ic lesson 01-1"),
    ...transformLessonData(lessonData12, "ic lesson 01-2"),
    ...transformLessonData(lessonData21, "ic lesson 02-1"),
    ...transformLessonData(lessonData22, "ic lesson 02-2"),
    ...transformLessonData(lessonData31, "ic lesson 03-1"),
    ...transformLessonData(lessonData32, "ic lesson 03-2"),
    ...transformLessonData(lessonData41, "ic lesson 04-1"),
    ...transformLessonData(lessonData42, "ic lesson 04-2"),
    ...transformLessonData(lessonData51, "ic lesson 05-1"),
    ...transformLessonData(lessonData52, "ic lesson 05-2"),
    ...transformLessonData(lessonData61, "ic lesson 06-1"),
    ...transformLessonData(lessonData62, "ic lesson 06-2"),
    ...transformLessonData(lessonData71, "ic lesson 07-1"),
    ...transformLessonData(lessonData72, "ic lesson 07-2"),
    ...transformLessonData(lessonData81, "ic lesson 08-1"),
    ...transformLessonData(lessonData82, "ic lesson 08-2"),
    ...transformLessonData(lessonData91, "ic lesson 09-1"),
    ...transformLessonData(lessonData92, "ic lesson 09-2"),
    ...transformLessonData(lessonData101, "ic lesson 10-1"),
    ...transformLessonData(lessonData102, "ic lesson 10-2"),
    ...transformLessonData(lessonData111, "ic lesson 11-1"),
    ...transformLessonData(lessonData111supp, "ic lesson 11-1 supplemental"),
    ...transformLessonData(lessonData112, "ic lesson 11-2"),
    ...transformLessonData(lessonData121, "ic lesson 12-1"),
    ...transformLessonData(lessonData122, "ic lesson 12-2"),
    ...transformLessonData(lessonData131, "ic lesson 13-1"),
    ...transformLessonData(lessonData131supp, "ic lesson 13-1 supplemental"),
    ...transformLessonData(lessonData131directions, "ic lesson 13-1 directions"),
    ...transformLessonData(lessonData132, "ic lesson 13-2"),
    ...transformLessonData(lessonData141, "ic lesson 14-1"),
    ...transformLessonData(lessonData141supp, "ic lesson 14-1 supplemental"),
    ...transformLessonData(lessonData142, "ic lesson 14-2"),
    ...transformLessonData(lessonData142supp, "ic lesson 14-2 supplemental"),
    ...transformLessonData(fables1, "fable 1"),
    ...transformLessonData(fables2, "fable 2"),
    ...transformLessonData(fables3, "fable 3"),
  ];
}
