import { routes } from '../../app/router';

const root = routes.learningPath;
const lab = root + '/word';
export const pathLinks = {
  root, lab, lessons: root + '/lessons',
  lesson: (id: string) => root + '/lesson/' + id,
  word: (id: string, lessonId?: string) => lab + '/' + id + (lessonId ? '?lesson=' + encodeURIComponent(lessonId) : ''),
};
