import { Component, PropsWithChildren } from 'react'
import './styles/global.scss'

class App extends Component<PropsWithChildren> {
  render() {
    return this.props.children
  }
}

export default App
