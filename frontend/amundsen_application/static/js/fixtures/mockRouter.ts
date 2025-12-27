import { RouteComponentProps } from 'react-router';
import * as History from 'history';

// Define proper type for route params
type RouteParams = { [key: string]: string | undefined };

// Mock React-Router
export function getMockRouterProps<P extends RouteParams = RouteParams>(
  data: P,
  location: Partial<History.Location> = {}
): RouteComponentProps<P> {
  const mockLocation: History.Location = {
    hash: '',
    key: '',
    pathname: '',
    search: '',
    state: {},
    ...location,
  };

  const props: RouteComponentProps<P> = {
    match: {
      isExact: true,
      params: data,
      path: '',
      url: '',
    },
    location: mockLocation,
    // This history object is a mock and `null`s many of the required methods. The
    // tests are designed not to trigger them, if they do, an error is expected.
    // So cast this as any.
    history: {
      length: 2,
      action: 'POP' as History.Action,
      location: mockLocation,
      push: null as any,
      replace: null as any,
      go: null as any,
      goBack: null as any,
      goForward: null as any,
      block: null as any,
      createHref: null as any,
      listen: null as any,
    },
    staticContext: {},
  };

  return props;
}