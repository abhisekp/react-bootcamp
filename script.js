/* global React,ReactDOM, _, axios, Reactstrap */

const { CancelToken } = axios;
const {
  size, includes, map, first,
} = _;
const {
  Progress, Container, Row, Col, Nav, NavItem, NavLink,
} = Reactstrap;

function fetchPopularRepos(language = 'all') {
  const source = CancelToken.source();
  const encodedURI = encodeURI(`https://api.github.com/search/repositories?q=stars:>1+language:${language}&sort=stars&order=desc&type=Repositories`);

  const requestPromise = axios.get(encodedURI, {
    cancelToken: source.token,
    timeout: 10e3,
  });

  const fn = async () => {
    const {
      data: { items: popularRepos },
    } = await requestPromise;
    return popularRepos;
  };
  fn.cancel = source.cancel;

  return fn;
}

/* eslint-disable camelcase */
const Repo = ({
  name, html_url, owner: { login } = {}, stargazers_count,
}) => (
  <ul>
    <li>
      <a href={html_url}>{name}</a>
    </li>
    <li>{login}</li>
    <li>{stargazers_count} stars</li>
  </ul>
);
/* eslint-enable camelcase */

class Loading extends React.Component {
  static originalText = 'Loading';

  state = {
    text: Loading.originalText,
  };

  componentDidMount() {
    this.timeStart = Date.now();
    const stopper = `${this.state.text}...`;

    this.loadingId = setInterval(() => {
      if (this.state.text === stopper) {
        this.setState({
          text: Loading.originalText,
        });
      } else {
        this.setState(({ text }) => ({
          text: `${text}.`,
        }));
      }
    }, 300);
  }

  componentWillUnmount() {
    clearInterval(this.loadingId);
  }

  render() {
    const progressVal = ((Date.now() - this.timeStart) / 3e3 * 1e2) % 1e2;

    return (
      <Progress striped bar color="success" value={progressVal}>
        {this.state.text}
      </Progress>
    );
  }
}

const languages = ['all', 'javascript', 'ruby', 'python'];

class App extends React.Component {
  state = {
    repos: [],
    loading: true,
    selectedLanguage: first(languages),
  };

  async componentDidMount() {
    console.log('--componentDidMount--');

    if (typeof this.popularReposFn === 'function') {
      this.popularReposFn.cancel();
    }
    this.popularReposFn = fetchPopularRepos();

    const newRepos = await this.popularReposFn();

    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState({
      loading: false,
      repos: newRepos,
    });
  }

  handleLangSelect = async (lang) => {
    if (lang === this.state.selectedLanguage || !includes(lang, languages)) {
      return;
    }

    this.setState({
      loading: true,
      repos: [],
      selectedLanguage: lang,
    });

    if (
      typeof this.popularReposFn === 'function' &&
      typeof this.popularReposFn.cancel === 'function'
    ) {
      this.popularReposFn.cancel('Cancelled by new language selection');
    }
    this.popularReposFn = fetchPopularRepos(lang);

    let newRepos = [];
    try {
      newRepos = await this.popularReposFn();
    } catch (error) {
      if (axios.isCancel(error)) {
        console.error(error.message);
      } else {
        throw error;
      }
    }

    this.setState({
      loading: false,
      repos: newRepos,
    });
  };

  render() {
    console.log('--render--');
    const { repos, loading, selectedLanguage } = this.state;

    return (
      <Container>
        <Nav>
          {map(
            lang => (
              <NavItem key={lang}>
                <NavLink href={`#${lang}`} onClick={() => this.handleLangSelect(lang)}>
                  {lang}
                </NavLink>
              </NavItem>
            ),
            languages,
          )}
        </Nav>
        <div>
          <h1 className="text-center">{selectedLanguage}</h1>
          <Row>
            {loading || (!loading && size(repos) === 0) ? (
              <Loading />
            ) : (
              map(
                repoInfo => (
                  <Col xs="auto" key={repoInfo.id}>
                    <Repo {...repoInfo} />
                  </Col>
                ),
                repos,
              )
            )}
          </Row>
        </div>
      </Container>
    );
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
