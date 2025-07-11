// export default defineNuxtRouteMiddleware((to, from) => {
//   const user = useSupabaseUser();

//   const publicRoutes = ['/invite', '/login'];

//   console.warn("middleware", to.path);

//   if (!user.value && !publicRoutes.includes(to.path)) {
//     // return navigateTo('/login');
//   }
// });
