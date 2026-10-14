import { redirect } from "next/navigation";

/** Route::get('/{slug}', 'User\HomeController@index') — unknown top-level paths show the home page. */
export default function CatchAll() {
  redirect("/");
}
