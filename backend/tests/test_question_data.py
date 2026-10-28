from models.question_data import CompetencyMap, Competency, Rubric, QuestionExemplar


def test_competency_map_loads_and_weights_sum_close_to_one():
    cm = CompetencyMap(
        role="SDE",
        competencies=[
            Competency(area="DSA", weight=0.5),
            Competency(area="System Design", weight=0.5),
        ],
    )
    assert cm.role == "SDE"
    assert abs(sum(c.weight for c in cm.competencies) - 1.0) < 1e-6


def test_exemplar_has_followups_and_rubric():
    ex = QuestionExemplar(
        id="ex1", role="SDE", competency="DSA", type="technical", difficulty=3,
        prompt="Detect a cycle in a linked list",
        ideal_answer_points=["Floyd's algorithm", "O(1) space"],
        follow_up_hooks=["What if the list is doubly linked?", "What if it has a cycle?", "Can you do it in O(1) space?"],
        rubric=Rubric(criteria={"correctness": "names a valid O(1) approach"}),
    )
    assert "correctness" in ex.rubric.criteria
    assert ex.follow_up_hooks
