import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>${getRandEmoji()}</h1>
  </div>
`;

function getRandEmoji(): string {
    let emoji = [':)', ':(', '>:(', ':D', '>:D', ':^D', ':(', ':D', 'O_O', 'O_o', '𓆉'];
    return emoji[Math.floor(Math.random() * emoji.length)];
}