import { PersonalTasks } from "../components/PersonalTasks";
export default function MyTasksPage() {
  return <main className="page"><div className="page-heading"><div><span className="eyebrow">MAKE SPACE FOR FOCUS</span><h1 className="mt-2">My tasks</h1><p>Your open work, across all your active projects.</p></div></div><PersonalTasks full /></main>;
}
