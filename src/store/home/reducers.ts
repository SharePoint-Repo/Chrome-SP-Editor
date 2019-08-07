import { Constants, HomeActions, IHomeState } from './types';

const init: IHomeState = {
  list: [],
  loading: false
};

export function homeReducer(state: IHomeState = init, action: HomeActions): IHomeState {
  switch (action.type) {
    case Constants.ADD_ITEM:
      return { ...state, list: [...state.list, action.payload.item] };
    case Constants.SET_LOADING:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}