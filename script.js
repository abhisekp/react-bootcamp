const { CancelToken } = axios;

function fetchMoreFriends() {
  const source = CancelToken.source();
  const requestMoreFriendsPromise = axios.get(
    'http://www.mocky.io/v2/5ad32e812d000065105c9773',
    {
      cancelToken: source.token,
    }
  );

  const fn = async () => {
    const {
      data: { data },
    } = await requestMoreFriendsPromise;
    const newFriends = data.map(friend => new Friend(friend));
    return newFriends;
  };
  fn.cancel = source.cancel;

  return fn;
}

class Friend {
  constructor({ name = '', active = true, deleted = false } = {}) {
    this.name = name;
    this.active = active;
    this.deleted = deleted;
  }
}

class Loading extends React.Component {
  static originalText = 'Loading';

  state = {
    text: Loading.originalText,
  };

  componentDidMount() {
    const stopper = this.state.text + '...';

    this.loadingId = setInterval(() => {
      if (this.state.text === stopper) {
        this.setState({
          text: Loading.originalText,
        });
      } else {
        this.setState(({ text }) => ({
          text: text + '.',
        }));
      }
    }, 300);
  }

  componentWillUnmount() {
    clearInterval(this.loadingId);
  }

  render() {
    return <h2>{this.state.text}</h2>;
  }
}

const FriendsList = ({
  list,
  onRemoveFriend,
  onDeactivateFriend,
  onActivateFriend,
  loading = false,
}) => {
  const activeFriends = list.filter(friend => friend.active);
  const inactiveFriends = list.filter(friend => !friend.active);

  return loading ? (
    <Loading />
  ) : (
    <div>
      <h1>Active Friends</h1>
      <ul>
        {activeFriends.map(({ name }) => (
          <li key={name}>
            <span>
              <b>{name}</b>
            </span>
            <button onClick={() => onRemoveFriend(name)}>Remove</button>
            <button onClick={() => onDeactivateFriend(name)}>Deactivate</button>
          </li>
        ))}
      </ul>
      <h1>Inactive Friends</h1>
      <ul>
        {inactiveFriends.map(({ name, deleted }) => (
          <li key={name}>
            {deleted ? (
              <span>
                <em>
                  <del>{name}</del>
                </em>
              </span>
            ) : (
              <span>{name}</span>
            )}
            <button onClick={() => onRemoveFriend(name)}>Remove</button>
            <button onClick={() => onActivateFriend(name)}>Activate</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

class App extends React.Component {
  state = {
    friends: [],
    input: '',
    loading: true,
  };

  handleAddFriend() {
    this.setState(({ input, friends }) => ({
      friends: friends.concat(new Friend({ name: input })),
      input: '',
    }));
  }

  handleRemoveFriend = name => {
    this.setState(({ friends }) => ({
      friends: friends.map(
        friend =>
          friend.name === name
            ? new Friend({ ...friend, deleted: true, active: false })
            : friend
      ),
    }));
  };

  handleInput = ev => {
    const { value } = ev.target;
    this.setState({
      input: value,
    });
  };

  handleSubmit = ev => {
    ev.preventDefault();
    this.handleAddFriend();
  };

  handleToggleActiveFriend = (name, active) => {
    this.setState(({ friends }) => {
      const newFriends = friends.map(
        friend =>
          friend.name === name
            ? new Friend({
                ...friend,
                active: typeof active === 'boolean' ? active : !friend.active,
              })
            : friend
      );

      return {
        friends: newFriends,
      };
    });
  };

  handleClearAll = () => {
    this.setState({
      friends: [],
    });
  };

  handleResetAll = async () => {
    this.setState({
      loading: true,
    });

    if (
      typeof this.moreFriends === 'function' &&
      typeof this.moreFriends.cancel === 'function'
    ) {
      this.moreFriends.cancel('Cancelled by reset');
    }
    this.moreFriends = fetchMoreFriends();

    let newFriends = [];
    try {
      newFriends = await this.moreFriends();
    } catch (error) {
      if (axios.isCancel(error)) {
        console.error(error.message);
      } else {
        throw error;
      }
    }

    this.setState(({ friends }) => ({
      loading: false,
      friends: newFriends,
    }));
  };

  async componentDidMount() {
    console.log('--componentDidMount--');

    if (typeof this.moreFriends === 'function') {
      this.moreFriends.cancel();
    }
    this.moreFriends = fetchMoreFriends();

    const newFriends = await this.moreFriends();

    this.setState(({ friends }) => ({
      loading: false,
      friends: newFriends,
    }));
  }

  componentDidUpdate(prevProps, prevState) {
    console.log('--componentDidUpdate--');
  }

  componentWillUnmount() {
    console.log('--componentWillUnmount--');
  }

  render() {
    console.log('--render--');
    const { friends, loading, input } = this.state;

    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <input
            value={input}
            onChange={this.handleInput}
            placeholder="new friend"
            disabled={loading}
          />
          <button disabled={loading}>Add Friend</button>
          <button type="button" onClick={this.handleResetAll}>
            Reset
          </button>
        </form>

        {!loading && friends.length === 0 ? (
          <h3>Please fetch more friends</h3>
        ) : (
          <FriendsList
            list={friends}
            onRemoveFriend={this.handleRemoveFriend}
            onActivateFriend={name => this.handleToggleActiveFriend(name, true)}
            onDeactivateFriend={name =>
              this.handleToggleActiveFriend(name, false)
            }
            loading={loading}
          />
        )}
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
