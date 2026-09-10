import {
  ChatCircleDots,
  MapTrifold,
  PaperPlaneTilt,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import type { OperationProjection, PortfolioProjection } from "../../domain/model";
import {
  answerGeographicQuestion,
  GEOGRAPHIC_QUESTION_GROUPS,
  GEOGRAPHIC_QUESTIONS,
  matchGeographicQuestion,
  type GeographicQuestion,
  type GeographicQuestionGroupId,
} from "./geo-assistant-data";

interface GeoAssistantProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly projection: OperationProjection;
  readonly portfolio: PortfolioProjection;
}

type ChatMessage =
  | { readonly id: number; readonly kind: "assistant"; readonly text: string }
  | { readonly id: number; readonly kind: "user"; readonly text: string };

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  kind: "assistant",
  text: "Posso explicar as evidências geográficas, as camadas consultadas e o encaminhamento do processo em análise.",
};

export function GeoAssistant({ projection, portfolio, open, onOpenChange: setOpen }: GeoAssistantProps) {
  const [selectedGroup, setSelectedGroup] = useState<GeographicQuestionGroupId>("process-map");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([INITIAL_MESSAGE]);
  const messageId = useRef(1);
  const responseTimer = useRef<number | null>(null);
  const messageEnd = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (responseTimer.current !== null) window.clearTimeout(responseTimer.current);
  }, []);

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ block: "nearest" });
  }, [messages, pending]);

  function appendMessage(kind: ChatMessage["kind"], text: string) {
    messageId.current += 1;
    const message: ChatMessage = { id: messageId.current, kind, text };
    setMessages((current) => [...current, message]);
  }

  function askQuestion(question: GeographicQuestion) {
    if (pending) return;
    appendMessage("user", question.prompt);
    setInput("");
    setPending(true);
    const answer = answerGeographicQuestion(question.id, projection, portfolio);
    responseTimer.current = window.setTimeout(() => {
      appendMessage("assistant", answer);
      setPending(false);
      responseTimer.current = null;
    }, 420);
  }

  function submitInput() {
    const questionText = input.trim();
    if (!questionText || pending) return;
    const question = matchGeographicQuestion(questionText);
    if (question) {
      askQuestion({ ...question, prompt: questionText });
      return;
    }

    appendMessage("user", questionText);
    setInput("");
    setPending(true);
    responseTimer.current = window.setTimeout(() => {
      appendMessage(
        "assistant",
        "Consigo responder perguntas sobre restrições territoriais, camadas, geometria, score, encaminhamento e localização. Escolha uma sugestão abaixo.",
      );
      setPending(false);
      responseTimer.current = null;
    }, 420);
  }

  return (
    <aside className={open ? "geo-assistant geo-assistant--open" : "geo-assistant"} aria-label="Assistente geográfico">
      {open ? (
        <section className="geo-assistant__panel" role="dialog" aria-label="Conversa com o assistente geográfico">
          <header className="geo-assistant__header">
            <span className="geo-assistant__avatar"><Sparkle aria-hidden="true" /></span>
            <span>
              <strong>Assistente LicenGeo</strong>
              <small><i aria-hidden="true" /> Contexto: {projection.scenario.id}</small>
            </span>
            <button type="button" aria-label="Fechar assistente" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
          </header>

          <div className="geo-assistant__context">
            <MapTrifold aria-hidden="true" />
            <span><strong>{projection.scenario.municipality}</strong><small>{projection.scenario.focusLayerLabel}</small></span>
          </div>

          <div className="geo-assistant__messages" role="log" aria-live="polite">
            {messages.map((message) => (
              <div className={`chat-message chat-message--${message.kind}`} key={message.id}>
                {message.kind === "assistant" ? <span className="chat-message__avatar"><Sparkle aria-hidden="true" /></span> : null}
                <p>{message.text}</p>
              </div>
            ))}
            {pending ? <div className="chat-message chat-message--assistant"><span className="chat-message__avatar"><Sparkle /></span><span className="chat-typing" aria-label="Assistente digitando"><i /><i /><i /></span></div> : null}
            <div ref={messageEnd} />
          </div>

          <div className="geo-assistant__question-library">
            <div className="geo-assistant__groups" role="tablist" aria-label="Grupos de perguntas">
              {GEOGRAPHIC_QUESTION_GROUPS.map((group) => (
                <button
                  className={selectedGroup === group.id ? "is-selected" : ""}
                  type="button"
                  role="tab"
                  aria-selected={selectedGroup === group.id}
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                >
                  <strong>{group.label}</strong>
                  <small>{group.description}</small>
                </button>
              ))}
            </div>
            <div className="geo-assistant__suggestions" role="tabpanel" aria-label="Perguntas sugeridas">
              {GEOGRAPHIC_QUESTIONS.filter((question) => question.group === selectedGroup).map((question) => (
              <button type="button" key={question.id} onClick={() => askQuestion(question)} disabled={pending}>
                <strong>{question.shortLabel}</strong>
                <small>{question.prompt}</small>
              </button>
              ))}
            </div>
          </div>

          <form className="geo-assistant__composer" onSubmit={(event) => { event.preventDefault(); submitInput(); }}>
            <input
              aria-label="Pergunta para o assistente geográfico"
              placeholder="Pergunte sobre os dados geográficos"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" aria-label="Enviar pergunta" disabled={!input.trim() || pending}><PaperPlaneTilt aria-hidden="true" /></button>
          </form>
          <small className="geo-assistant__notice">Respostas demonstrativas com dados fictícios e fontes identificadas.</small>
        </section>
      ) : null}

      <button className="geo-assistant__dock" type="button" aria-expanded={open} onClick={() => setOpen(true)}>
        <span><ChatCircleDots aria-hidden="true" /></span>
        <span><strong>Assistente geográfico</strong><small>Pergunte sobre o processo atual</small></span>
        <Sparkle aria-hidden="true" />
      </button>
    </aside>
  );
}
