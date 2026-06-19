import { Routes } from "@angular/router";
import { authGuard } from "./core/auth.guard.js";

export const routes: Routes = [
  { path: "", redirectTo: "dashboard", pathMatch: "full" },
  {
    path: "login",
    loadComponent: () =>
      import("./pages/login/login.component.js").then((m) => m.LoginComponent),
  },
  {
    path: "dashboard",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./pages/dashboard/dashboard.component.js").then((m) => m.DashboardComponent),
  },
  { path: "**", redirectTo: "dashboard" },
];
