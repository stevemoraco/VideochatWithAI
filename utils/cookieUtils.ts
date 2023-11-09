import Cookies from 'js-cookie';

export const setCookie = (name: string, value: string, expires: number | Date) => {
  Cookies.set(name, value, { expires });
};

export const getCookie = (name: string) => {
  return Cookies.get(name);
};

export const removeCookie = (name: string) => {
  Cookies.remove(name);
};